#!/usr/bin/env node
/**
 * 云存储同步工具：把本地分包 assets 上传到路线的云目录，并可选清理云端多余文件。
 *
 * 背景：gen-cloud-assets.js 只根据本地文件生成 fileID 映射，不会上传。
 *       素材更新（新增/改名/删除）后，必须先把图片同步到云存储，再跑 gen-cloud-assets.js，
 *       否则会生成"看似正确、实际不存在"的映射。
 *
 * 用法（在项目根目录执行）：
 *   node tools/upload-cloud.js                                   # 全部路线，dry-run（只打印计划）
 *   node tools/upload-cloud.js --route zhanshi-nightmare,zhanshi-nightmare-full
 *   node tools/upload-cloud.js --route zhanshi-nightmare,zhanshi-nightmare-full --apply
 *   node tools/upload-cloud.js --route <id> --apply --prune --gen
 *
 * 参数：
 *   --route <id[,id]>  只处理指定路线（默认全部）
 *   --apply            真正执行上传/删除（不加则为 dry-run）
 *   --prune            删除云端"本地已不存在"的文件（配合 --apply）
 *   --gen              全部上传成功后自动运行 gen-cloud-assets.js
 *
 * 注意：路线上声明了 compatCloudFiles 的文件（旧版本仍引用、当前版本已淘汰）
 * 会被排除在清理之外，并且在云端缺失时会告警——改名/删图后不要立刻清理，
 * 要等新版本全量上线、旧版本基本退出再删。
 *
 * 前置：tcb CLI 已登录（tcb login 或 tcb login --apiKeyId .. --apiKey ..）。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const cloudConfig = require(path.join(ROOT, 'config', 'cloud.js'));
const index = require(path.join(ROOT, 'data', 'localMapIndex.js'));
const ENV_ID = cloudConfig.envId;

// ---------- 定位 tcb CLI 入口（直接用 node 执行，避免 shell 对空格/全角字符的错误切分）----------
function resolveCli() {
  const candidates = [
    process.env.TCB_CLI_BIN,
    'C:\\nvm4w\\nodejs\\node_modules\\@cloudbase\\cli\\bin\\tcb',
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@cloudbase', 'cli', 'bin', 'tcb')
  ].filter(Boolean);
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  try { return require.resolve('@cloudbase/cli/bin/tcb'); } catch (e) { /* ignore */ }
  throw new Error('找不到 @cloudbase/cli 入口，请设置环境变量 TCB_CLI_BIN 指向 bin/tcb');
}
const CLI = resolveCli();

function runCli(args, { allowFail = false } = {}) {
  try {
    return execFileSync(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (err) {
    if (allowFail) return '';
    const detail = (err.stderr || err.stdout || err.message || '').toString().trim();
    throw new Error('tcb ' + args.slice(0, 2).join(' ') + ' 失败：' + detail);
  }
}

// ---------- 路线 → 云路径 ----------
function routePrefix(route) {
  return route.legacyCloudPackage ? route.legacyCloudPackage + '/assets' : route.assetNamespace;
}

function walk(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(full, r));
    else out.push({ abs: full, rel: r });
  }
  return out;
}

// 返回云端 key 数组；无法读取（未登录/网络失败）时返回 null，便于调用方区分"空目录"与"读不到"
function listRemote(prefix) {
  const raw = runCli(['storage', 'list', prefix, '-e', ENV_ID, '--json'], { allowFail: true });
  if (!raw || raw.indexOf('"data"') < 0) return null;
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let json;
  try { json = JSON.parse(raw.slice(start)); } catch (e) { return null; }
  if (!Array.isArray(json.data)) return null;
  // 注意：list 是字符串前缀匹配，"nightmare" 会连带匹配到 "nightmare-full"，必须按目录边界过滤
  return json.data.map(item => item.key).filter(key => typeof key === 'string' && key.indexOf(prefix + '/') === 0);
}

function parseArgs(argv) {
  const out = { routes: null, apply: false, prune: false, gen: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--prune') out.prune = true;
    else if (a === '--gen') out.gen = true;
    else if (a === '--route') { out.routes = String(argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean); i += 1; }
  }
  return out;
}

function main() {
  const opt = parseArgs(process.argv.slice(2));
  const routes = [];
  for (const map of index.maps || []) {
    for (const route of map.routes || []) {
      if (!route.packageRoot) continue;
      if (opt.routes && opt.routes.indexOf(route.id) < 0) continue;
      routes.push(route);
    }
  }
  if (!routes.length) throw new Error('没有匹配的路线');

  console.log('云环境: ' + ENV_ID);
  console.log('模式: ' + (opt.apply ? 'APPLY' : 'DRY-RUN') + (opt.prune ? ' + prune' : ''));
  console.log('路线: ' + routes.map(r => r.id).join(', '));
  console.log('');

  const plan = [];
  let totalUpload = 0;
  let totalDelete = 0;
  for (const route of routes) {
    const assetsDir = path.join(ROOT, route.packageRoot, 'assets');
    if (!fs.existsSync(assetsDir)) throw new Error('缺少 ' + route.packageRoot + '/assets，请先跑 sync-assets.js');
    const prefix = routePrefix(route);
    const locals = walk(assetsDir);
    const remoteKeys = listRemote(prefix);
    const remoteReadable = remoteKeys !== null;
    const remoteSet = new Set(remoteKeys || []);
    const expected = locals.map(f => prefix + '/' + f.rel);
    const compat = (route.compatCloudFiles || []).map(rel => prefix + '/' + String(rel).replace(/\\/g, '/'));
    // 兼容文件不在本地分包里，但绝不能进清理名单（旧版本仍在请求）
    const expectedSet = new Set(expected.concat(compat));
    // 上传：本地有、云端无 → 必传；其余为"可能变更"，--apply 时一并重传以保证一致
    const toUpload = locals.map(f => ({ abs: f.abs, key: prefix + '/' + f.rel, existsRemote: remoteSet.has(prefix + '/' + f.rel) }));
    const toDelete = remoteReadable ? (remoteKeys || []).filter(k => !expectedSet.has(k)) : [];
    plan.push({ route, prefix, toUpload, toDelete: remoteReadable ? toDelete : [] });
    totalUpload += toUpload.length;
    totalDelete += toDelete.length;
    console.log('【' + route.id + '】本地 ' + locals.length + ' / 云端 ' + (remoteReadable ? (remoteKeys || []).length : '读取失败'));
    console.log('  上传 ' + toUpload.length + '（其中云端缺失 ' + toUpload.filter(x => !x.existsRemote).length + '）');
    if (!remoteReadable) console.log('  ⚠ 云端列表读取失败（多为未登录），本次不做清理判断');
    else console.log('  清理 ' + toDelete.length + (toDelete.length ? ': ' + toDelete.map(k => k.slice(prefix.length + 1)).join(' | ') : ''));
    if (compat.length) {
      const compatMissing = remoteReadable ? compat.filter(k => !remoteSet.has(k)) : [];
      console.log('  兼容保留 ' + compat.length + '（旧版本仍引用，不参与清理）' +
        (compatMissing.length ? ' ⚠ 云端缺失: ' + compatMissing.map(k => k.slice(prefix.length + 1)).join(' | ') : ''));
    }
  }

  console.log('');
  console.log('合计：上传 ' + totalUpload + '，清理 ' + totalDelete);

  if (!opt.apply) {
    console.log('');
    console.log('这是 dry-run。确认无误后加 --apply 执行。');
    return;
  }

  let failed = 0;
  for (const item of plan) {
    for (const up of item.toUpload) {
      try {
        runCli(['storage', 'upload', up.abs, up.key, '-e', ENV_ID, '--times', '2']);
      } catch (e) {
        failed += 1;
        console.error('  [失败] ' + up.key + ' -> ' + e.message);
      }
    }
  }

  if (opt.prune) {
    for (const item of plan) {
      for (const key of item.toDelete) {
        try {
          runCli(['storage', 'rm', key, '-e', ENV_ID, '--force']);
        } catch (e) {
          failed += 1;
          console.error('  [删除失败] ' + key + ' -> ' + e.message);
        }
      }
    }
  }

  if (failed) {
    console.error('');
    console.error('有 ' + failed + ' 项失败，已跳过 gen-cloud-assets.js（避免生成不存在的映射）。');
    process.exitCode = 1;
    return;
  }

  if (opt.gen) {
    execFileSync(process.execPath, [path.join(ROOT, 'tools', 'gen-cloud-assets.js')], { stdio: 'inherit' });
  } else {
    console.log('');
    console.log('上传完成。下一步：node tools/gen-cloud-assets.js，然后 node tools/verify-cloud.js');
  }
}

try { main(); } catch (err) {
  console.error(String((err && err.message) || err));
  process.exitCode = 1;
}

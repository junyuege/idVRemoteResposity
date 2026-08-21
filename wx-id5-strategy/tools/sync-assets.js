#!/usr/bin/env node
/**
 * 跨平台素材同步工具（Node + sharp）。
 * 替代 tools/sync-assets.ps1：
 *   - 路线素材统一压缩为 .jpg，保证扩展名与文件内容一致；
 *   - fileIcons 识别图标按原格式复制，保留 PNG 透明度；
 *   - 每个分包独立控制 1.85MB 预算；
 *   - 生成 tools/import-report.json。
 *
 * 用法：
 *   node tools/sync-assets.js [--dry-run] [--prune-extras]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'data', 'localMapIndex.js');
const REPORT_PATH = path.join(ROOT, 'tools', 'import-report.json');
const BUDGET_MB = 1.85;
const WIDTHS = [1280, 1024, 800, 640];
const QUALITIES = [70, 60, 50];
const IMAGE_META_PATH = path.join(ROOT, 'data', 'imageMeta.js');
const imageMeta = {};

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('缺少 sharp 依赖，请先执行：cd tools && npm install');
  process.exit(1);
}

const index = require(INDEX_PATH);

function normalizeAnchor(anchor) {
  if (!anchor) return '';
  let p = String(anchor).replace(/\//g, path.sep);
  if (!p.endsWith(path.sep)) p += path.sep;
  return p;
}

function extnameLower(file) {
  return path.extname(String(file || '')).toLowerCase();
}

function sourceCandidates(baseDir, relParts) {
  const primary = path.join(baseDir, ...relParts);
  // 素材可能放在 shape/door/file 三层，也可能平铺在 shape 目录（门名含在文件名里）。
  const shapeFlat = relParts.length >= 3
    ? path.join(baseDir, relParts[0], relParts[relParts.length - 1])
    : primary;
  const flat = path.join(baseDir, relParts[relParts.length - 1]);
  return [primary, shapeFlat, flat];
}

function resolveSource(candidate) {
  if (!candidate) return '';
  if (fs.existsSync(candidate)) return candidate;
  const dir = path.dirname(candidate);
  const base = path.basename(candidate, path.extname(candidate));
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const alt = path.join(dir, base + ext);
    if (fs.existsSync(alt)) return alt;
  }
  return candidate;
}

function collectRouteEntries() {
  const plans = {};
  const missing = [];
  const maps = index.maps || [];
  maps.forEach(map => {
    const anchor = normalizeAnchor(map.sourceAnchor);
    (map.routes || []).forEach(route => {
      const pkg = route.packageRoot;
      if (!pkg) return;
      const routeAnchor = normalizeAnchor(route.sourceAnchor || anchor);
      const entries = [];
      const add = (rel, candidateParts) => {
        const src = sourceCandidates(routeAnchor + (route.shapeDir ? route.shapeDir + path.sep : ''), candidateParts)
          .map(resolveSource)
          .find(candidate => fs.existsSync(candidate));
        if (!src) {
          missing.push({ pkg, rel, candidates: candidateParts.join('/') });
        } else {
          entries.push({ src, rel });
        }
      };
      (route.rootFiles || []).forEach(file => add(file, [file]));
      (route.shapes || []).forEach(shape => {
        const detail = (route.shapeDetails || {})[shape] || {};
        (detail.rootFiles || []).forEach(file => add(shape + '/' + file, [shape, file]));
        (detail.doors || []).forEach(door => {
          (door.files || []).forEach(file => add(shape + '/' + door.door + '/' + file, [shape, door.door, file]));
        });
      });
      if (!plans[pkg]) plans[pkg] = [];
      plans[pkg].push(...entries);
    });
  });
  return { plans, missing };
}

function collectIconEntries() {
  const plans = {};
  const missing = [];
  (index.maps || []).forEach(map => {
    const anchor = normalizeAnchor(map.sourceAnchor);
    (map.routes || []).forEach(route => {
      if (route.entryMode !== 'fileIcons' || !route.iconPackageRoot) return;
      const pkg = route.iconPackageRoot;
      const routeAnchor = normalizeAnchor(route.sourceAnchor || anchor);
      if (!plans[pkg]) plans[pkg] = [];
      (route.shapes || []).forEach(shape => {
        const detail = (route.shapeDetails || {})[shape] || {};
        (detail.rootFiles || []).forEach(file => {
          const candidates = sourceCandidates(routeAnchor + (route.shapeDir ? route.shapeDir + path.sep : ''), [shape, file])
            .map(resolveSource);
          const src = candidates.find(candidate => fs.existsSync(candidate));
          if (!src) {
            missing.push({ pkg, shape, file });
          } else {
            plans[pkg].push({ src, rel: shape + '/' + path.basename(src) });
          }
        });
      });
    });
  });
  return { plans, missing };
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function actualRelativeFiles(pkgRoot) {
  const assetsDir = path.join(ROOT, pkgRoot, 'assets');
  if (!fs.existsSync(assetsDir)) return [];
  return walkFiles(assetsDir).map(file => path.relative(assetsDir, file).split(path.sep).join('/'));
}

function writeReport(report) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
}

module.exports = { collectRouteEntries, collectIconEntries, writeReport };

async function findBestVariant(entries) {
  let best = null;
  for (const quality of QUALITIES) {
    for (const width of WIDTHS) {
      const buffers = [];
      let total = 0;
      for (const entry of entries) {
        const meta = await sharp(entry.src).metadata();
        const outWidth = meta.width > width ? width : meta.width;
        const outHeight = meta.width > width ? Math.round(meta.height * width / meta.width) : meta.height;
        // 路线图统一 JPEG（截图场景体积可控；索引扩展名已归一为 .jpg）
        const buffer = await sharp(entry.src)
          .resize({ width, withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality, progressive: true })
          .toBuffer();
        buffers.push({ entry, buffer, width: outWidth, height: outHeight });
        total += buffer.length;
      }
      const fit = total <= Math.floor(BUDGET_MB * 1024 * 1024);
      if (!best) best = { width, quality, total, fit, buffers };
      if (fit) return { width, quality, total, buffers };
    }
  }
  return best;
}

function writeRoutePackage(pkg, entries, variant) {
  const assetsDir = path.join(ROOT, pkg, 'assets');
  if (fs.existsSync(assetsDir)) fs.rmSync(assetsDir, { recursive: true, force: true });
  for (const item of variant.buffers) {
    const dest = path.join(assetsDir, ...item.entry.rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.buffer);
    imageMeta[pkg + '/assets/' + item.entry.rel] = { w: item.width, h: item.height };
  }
  return variant.buffers.reduce((sum, item) => sum + item.buffer.length, 0);
}

async function findBestIconVariant(entries) {
  // 图标源约 900x1500，现有分包图标约 250px 宽；这里从 256px 开始尝试，
  // PNG 使用调色板压缩以保留透明通道，JPEG 继续使用 JPEG。
  let best = null;
  for (const width of [256, 224, 192, 160]) {
    const buffers = [];
    let total = 0;
    for (const entry of entries) {
      const meta = await sharp(entry.src).metadata();
      const isPng = meta.format === 'png';
      const outWidth = meta.width > width ? width : meta.width;
      const outHeight = meta.width > width ? Math.round(meta.height * width / meta.width) : meta.height;
      const pipeline = sharp(entry.src).resize({ width, withoutEnlargement: true });
      const buffer = isPng
        ? await pipeline.png({ palette: true, compressionLevel: 9 }).toBuffer()
        : await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 78, progressive: true }).toBuffer();
      buffers.push({ entry, buffer, isPng, width: outWidth, height: outHeight });
      total += buffer.length;
    }
    const fit = total <= Math.floor(BUDGET_MB * 1024 * 1024);
    if (!best) best = { width, total, fit, buffers };
    if (fit) return { width, total, buffers };
  }
  return best;
}

function writeIconPackage(pkg, entries, variant) {
  const assetsDir = path.join(ROOT, pkg, 'assets');
  if (fs.existsSync(assetsDir)) fs.rmSync(assetsDir, { recursive: true, force: true });
  let bytes = 0;
  for (const item of variant.buffers) {
    const dest = path.join(assetsDir, ...item.entry.rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.buffer);
    imageMeta[pkg + '/assets/' + item.entry.rel] = { w: item.width, h: item.height };
    bytes += item.buffer.length;
  }
  return bytes;
}

function writeImageMeta() {
  const body = '// 攻略图片宽高元数据，由 tools/sync-assets.js 生成\n' +
    '// key = 分包/assets 相对路径，value = { w, h }，用于详情页稳定占位。\n' +
    'module.exports = ' + JSON.stringify(imageMeta, null, 2) + ';\n';
  fs.writeFileSync(IMAGE_META_PATH, body, 'utf8');
}
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pruneExtras = process.argv.includes('--prune-extras');

  const routePlan = collectRouteEntries();
  const iconPlan = collectIconEntries();
  const allMissing = [...routePlan.missing, ...iconPlan.missing];
  if (allMissing.length) {
    console.error('=== 源文件缺失 ' + allMissing.length + ' 个（索引与源盘不一致） ===');
    allMissing.forEach(item => console.error('  [' + item.pkg + '] ' + JSON.stringify(item)));
    process.exitCode = 2;
    return;
  }

  const report = [];

  for (const [pkg, entries] of Object.entries(routePlan.plans).sort(([a], [b]) => a.localeCompare(b))) {
    if (dryRun) {
      const srcBytes = entries.reduce((sum, e) => sum + fs.statSync(e.src).size, 0);
      let estimate = 0;
      let fit = 'NONE';
      for (const width of WIDTHS) {
        const candidate = Math.floor(srcBytes * 0.045 * (width / 1280) * (width / 1280));
        if (candidate <= Math.floor(BUDGET_MB * 1024 * 1024)) { estimate = candidate; fit = width + 'px'; break; }
      }
      report.push({ Pkg: pkg, Count: entries.length, Bytes: 0, Missing: [], Extra: [], MissingCount: 0, ExtraCount: 0, Pruned: 0 });
      console.log('[DRY] ' + pkg + ' ' + entries.length + '张 源' + (srcBytes / 1024 / 1024).toFixed(1) + 'MB -> 估算' + (estimate / 1024 / 1024).toFixed(2) + 'MB 档位' + fit);
      continue;
    }
    const variant = await findBestVariant(entries);
    const bytes = writeRoutePackage(pkg, entries, variant);
    const expected = new Set(entries.map(e => e.rel));
    const actual = actualRelativeFiles(pkg);
    const missing = entries.filter(e => !actual.includes(e.rel)).map(e => e.rel);
    let extra = actual.filter(rel => !expected.has(rel));
    let pruned = [];
    if (pruneExtras) {
      pruned = extra.slice();
      extra.forEach(rel => fs.rmSync(path.join(ROOT, pkg, 'assets', ...rel.split('/')), { force: true }));
      extra = [];
    }
    report.push({ Pkg: pkg, Count: entries.length, Bytes: bytes, Missing: missing, Extra: extra, MissingCount: missing.length, ExtraCount: extra.length, Pruned: pruned.length });
    console.log('[' + (missing.length === 0 && extra.length === 0 ? 'OK' : '!!') + '] ' + pkg + ' ' + entries.length + '张 ' + (bytes / 1024 / 1024).toFixed(1) + 'MB ' + variant.width + 'px/q' + variant.quality + ' 缺失' + missing.length + ' 多余' + extra.length);
  }

  for (const [pkg, entries] of Object.entries(iconPlan.plans).sort(([a], [b]) => a.localeCompare(b))) {
    if (dryRun) {
      const srcBytes = entries.reduce((sum, e) => sum + fs.statSync(e.src).size, 0);
      report.push({ Pkg: pkg, Count: entries.length, Bytes: 0, Missing: [], Extra: [], MissingCount: 0, ExtraCount: 0, Pruned: 0 });
      console.log('[DRY] ' + pkg + ' ' + entries.length + '张 图标源' + (srcBytes / 1024 / 1024).toFixed(1) + 'MB（将压缩到 ' + BUDGET_MB + 'MB 预算内）');
      continue;
    }
    const iconVariant = await findBestIconVariant(entries);
    const bytes = writeIconPackage(pkg, entries, iconVariant);
    const expected = new Set(entries.map(e => e.rel));
    const actual = actualRelativeFiles(pkg);
    const missing = entries.filter(e => !actual.includes(e.rel)).map(e => e.rel);
    let extra = actual.filter(rel => !expected.has(rel));
    let pruned = [];
    if (pruneExtras) {
      pruned = extra.slice();
      extra.forEach(rel => fs.rmSync(path.join(ROOT, pkg, 'assets', ...rel.split('/')), { force: true }));
      extra = [];
    }
    report.push({ Pkg: pkg, Count: entries.length, Bytes: bytes, Missing: missing, Extra: extra, MissingCount: missing.length, ExtraCount: extra.length, Pruned: pruned.length });
    console.log('[' + (missing.length === 0 && extra.length === 0 ? 'OK' : '!!') + '] ' + pkg + ' ' + entries.length + '张 ' + (bytes / 1024 / 1024).toFixed(1) + 'MB 图标 ' + iconVariant.width + 'px');
  }

  if (!dryRun) {
    writeReport(report);
    writeImageMeta();
    const totalMissing = report.reduce((sum, r) => sum + r.MissingCount, 0);
    const totalExtra = report.reduce((sum, r) => sum + r.ExtraCount, 0);
    const totalPruned = report.reduce((sum, r) => sum + r.Pruned, 0);
    console.log('=== 素材同步完成：' + report.length + ' 个分包，缺失 ' + totalMissing + '，多余 ' + totalExtra + '，清理 ' + totalPruned + ' ===');
    console.log('报告: tools/import-report.json');
    process.exitCode = totalMissing || totalExtra ? 1 : 0;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

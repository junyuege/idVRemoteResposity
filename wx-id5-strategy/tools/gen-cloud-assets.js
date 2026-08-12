// 从本地 pkg-*/assets（或 tools/asset-cache/*/assets 备份）与云存储 fileID 规律生成 data/cloudAssets.js
// 用法：把云存储任意一条记录的「云文件 ID」填到 CLOUD_PREFIX（示例见下），运行 node tools/gen-cloud-assets.js
// 前提：云存储已按 pkg-*/assets 结构上传（路径 = {pkg}/assets/{rel}）
const fs = require('fs');
const path = require('path');

// 示例：cloud://cloud1-d0gmgc29t00d235d8.636c-cloud1-d0gmgc29t00d235d8-1465150433/pkg-easy/assets/...
const CLOUD_PREFIX = 'cloud://cloud1-d0gmgc29t00d235d8.636c-cloud1-d0gmgc29t00d235d8-1465150433/';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { for (const f of walk(p)) out.push(f); }
    else out.push(p);
  }
  return out;
}

const ROOT = path.join(__dirname, '..');
// 上传瘦身后的资产可能已移入 tools/asset-cache/{pkg}/assets，兼容两种位置
function findAssets(pkg) {
  const candidates = [
    path.join(ROOT, pkg, 'assets'),
    path.join(ROOT, 'tools', 'asset-cache', pkg, 'assets')
  ];
  return candidates.find(d => fs.existsSync(d)) || null;
}

const items = [];
for (const pkg of fs.readdirSync(ROOT).filter(n => /^pkg-/.test(n))) {
  const ad = findAssets(pkg);
  if (!ad) { console.warn('未找到 ' + pkg + ' 的资产目录（先跑 tools/sync-assets.ps1）'); continue; }
  for (const f of walk(ad)) {
    const rel = f.slice(ad.length + 1).replace(/\\/g, '/');
    items.push({ key: pkg + '/' + rel, fid: CLOUD_PREFIX + pkg + '/assets/' + rel });
  }
}
items.sort((a, b) => a.key.localeCompare(b.key, 'zh-Hans-CN'));

const body = '// 云存储资产映射 { key: fileID }，由 tools/gen-cloud-assets.js 生成\n' +
  '// key = 分包名/相对路径（如 "pkg-hard/┏/侧门在下/右路.jpg"）\n' +
  '// data/api.js 优先取此表，缺省回退本地分包路径\n' +
  'module.exports = {\n' +
  items.map(i => '  ' + JSON.stringify(i.key) + ': ' + JSON.stringify(i.fid) + ',').join('\n') +
  '\n};\n';
fs.writeFileSync(path.join(ROOT, 'data', 'cloudAssets.js'), body, 'utf8');
console.log('生成 ' + items.length + ' 条映射 -> data/cloudAssets.js');
console.log('样例 key: ' + items[0].key);
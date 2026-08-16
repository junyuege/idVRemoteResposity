// 按索引中的 assetNamespace 生成云存储映射。
// 前提：已把每条路线的 assets 上传到 {assetNamespace}/{relPath}。
// 本脚本只生成映射，不上传文件，也不处理视频。
const fs = require('fs');
const path = require('path');

// 示例：cloud://cloud1-d0gmgc29t00d235d8.636c-cloud1-d0gmgc29t00d235d8-1465150433/pkg-easy/assets/...
const cloudConfig = require('../config/cloud.js');
const CLOUD_PREFIX = cloudConfig.storagePrefix;

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
const index = require(path.join(ROOT, 'data', 'localMapIndex.js'));

// 路线图片云路径解析：legacyCloudPackage 指向旧布局 pkg-*/assets/，
// 否则使用 assetNamespace（新布局 maps/...）。
// 与 data/api.js 的 cloudUrl 查找顺序保持一致，保证重生成不破坏现有云映射。
function resolveAssetKey(route, rel) {
  if (route.legacyCloudPackage) return route.legacyCloudPackage + '/' + rel;
  return route.assetNamespace + '/' + rel;
}

function resolveAssetFid(key, route) {
  if (route.legacyCloudPackage) {
    return CLOUD_PREFIX + route.legacyCloudPackage + '/assets/' + key.slice(route.legacyCloudPackage.length + 1);
  }
  return CLOUD_PREFIX + key;
}

const items = [];
for (const map of index.maps || []) {
  for (const route of map.routes || []) {
    if (!route.packageRoot || !route.assetNamespace) {
      throw new Error('路线缺少 packageRoot 或 assetNamespace: ' + (route.id || 'unknown'));
    }
    const assetsDir = path.join(ROOT, route.packageRoot, 'assets');
    if (!fs.existsSync(assetsDir)) {
      throw new Error('未找到 ' + route.packageRoot + '/assets（先运行 tools/sync-assets.ps1）');
    }
    for (const file of walk(assetsDir)) {
      const rel = file.slice(assetsDir.length + 1).replace(/\\/g, '/');
      const key = resolveAssetKey(route, rel);
      items.push({ key, fid: resolveAssetFid(key, route) });
    }

    if (route.iconPackageRoot && route.iconNamespace) {
      const iconDir = path.join(ROOT, route.iconPackageRoot, 'assets');
      if (!fs.existsSync(iconDir)) {
        throw new Error('未找到 ' + route.iconPackageRoot + '/assets（识别图标需要先生成本地分包）');
      }
      for (const file of walk(iconDir)) {
        const rel = file.slice(iconDir.length + 1).replace(/\\/g, '/');
        const key = route.iconNamespace + '/' + rel;
        items.push({ key, fid: CLOUD_PREFIX + key });
      }
    }
  }
}
items.sort((a, b) => a.key.localeCompare(b.key, 'zh-Hans-CN'));

const body = '// 云存储资产映射 { key: fileID }，由 tools/gen-cloud-assets.js 生成\n' +
  '// key = assetNamespace/相对路径（如 "maps/e_yun_zhi_nv/zhanshi/hard-full/┏/侧门在下/右路.jpg"）\n' +
  '// data/api.js 优先取此表，缺省回退本地分包路径\n' +
  'module.exports = {\n' +
  items.map(i => '  ' + JSON.stringify(i.key) + ': ' + JSON.stringify(i.fid) + ',').join('\n') +
  '\n};\n';
fs.writeFileSync(path.join(ROOT, 'data', 'cloudAssets.js'), body, 'utf8');
console.log('生成 ' + items.length + ' 条映射 -> data/cloudAssets.js');
console.log('样例 key: ' + items[0].key);

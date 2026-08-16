#!/usr/bin/env node
/**
 * 云端一致性检查：对比 cloudAssets.js 与云存储实际文件。
 * 前置：已执行 tcb login，且 tcb 在 PATH 中。
 * 运行：node tools/verify-cloud.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const cloudConfig = require('../config/cloud.js');
const index = require('../data/localMapIndex.js');
const cloudAssets = require('../data/cloudAssets.js');
const ENV_ID = cloudConfig.envId;
const FILE_ID_ROOT = cloudConfig.storagePrefix;

function listCloud(prefix) {
  const prefixArg = prefix.replace(/\/$/, '');
  const cmd = 'tcb storage list "' + prefixArg + '" -e ' + ENV_ID + ' --json';
  const raw = execSync(cmd, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const start = raw.indexOf('{');
  if (start < 0) throw new Error('无法解析 tcb 输出: ' + raw.slice(0, 200));
  const json = JSON.parse(raw.slice(start));
  return Array.isArray(json.data) ? json.data : [];
}

function cloudMappings() {
  const mappings = [];
  (index.maps || []).forEach(map => (map.routes || []).forEach(route => {
    if (route.packageRoot && route.assetNamespace) {
      mappings.push({
        cloudPrefix: (route.legacyCloudPackage ? route.legacyCloudPackage + '/assets/' : route.assetNamespace + '/'),
        localPrefix: route.packageRoot + '/assets/'
      });
    }
    if (route.iconPackageRoot && route.iconNamespace) {
      mappings.push({
        cloudPrefix: route.iconNamespace + '/',
        localPrefix: route.iconPackageRoot + '/assets/'
      });
    }
  }));
  return mappings;
}

function main() {
  const expected = Object.values(cloudAssets).map(fileId => fileId.slice(FILE_ID_ROOT.length));
  const prefixes = [...new Set(cloudMappings().map(item => item.cloudPrefix))];
  const actual = [];
  const actualSeen = new Set();
  for (const prefix of prefixes) {
    listCloud(prefix).forEach(item => {
      if (!actualSeen.has(item.key)) {
        actualSeen.add(item.key);
        actual.push(item);
      }
    });
  }

  const actualKeys = new Set(actual.map(item => item.key));
  const expectedKeys = new Set(expected);
  const missing = expected.filter(key => !actualKeys.has(key));
  const extra = actual.map(item => item.key).filter(key => !expectedKeys.has(key));

  const mappings = cloudMappings().sort((a, b) => b.cloudPrefix.length - a.cloudPrefix.length);
  let sizeDiff = 0;
  const sizeDiffList = [];
  actual.forEach(item => {
    const mapping = mappings.find(m => item.key.startsWith(m.cloudPrefix));
    if (!mapping) return;
    const localPath = path.join(ROOT, mapping.localPrefix, item.key.slice(mapping.cloudPrefix.length));
    if (!fs.existsSync(localPath)) {
      sizeDiff += 1;
      sizeDiffList.push('本地缺失: ' + item.key);
      return;
    }
    if (fs.statSync(localPath).size !== Number(item.size)) {
      sizeDiff += 1;
      sizeDiffList.push('大小不一致: ' + item.key);
    }
  });

  console.log('云环境:', ENV_ID);
  console.log('期望文件:', expected.length);
  console.log('云端文件:', actual.length);
  console.log('缺失:', missing.length);
  console.log('多余:', extra.length);
  console.log('大小/本地不一致:', sizeDiff);

  missing.slice(0, 20).forEach(key => console.log('  -', key));
  extra.slice(0, 20).forEach(key => console.log('  +', key));
  sizeDiffList.slice(0, 20).forEach(key => console.log('  ~', key));

  const ok = missing.length === 0 && extra.length === 0 && sizeDiff === 0;
  console.log(ok ? 'CLOUD_OK' : 'CLOUD_MISMATCH');
  process.exitCode = ok ? 0 : 1;
}

try {
  main();
} catch (err) {
  console.error('verify-cloud 失败：', err && err.message || err);
  console.error('请确认已安装 @cloudbase/cli 并执行 tcb login。');
  process.exit(2);
}

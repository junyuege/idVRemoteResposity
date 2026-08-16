#!/usr/bin/env node
/**
 * 一键发布前检查：
 *   1. 重新生成云映射
 *   2. 项目完整性校验
 *   3. 全功能冒烟测试
 *   4. 云端一致性检查（可 --skip-cloud 跳过，例如 CI 环境）
 * 运行：node tools/release-check.js [--skip-cloud]
 */
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_CLOUD = process.argv.includes('--skip-cloud');
const steps = [
  { name: '生成云映射', file: 'tools/gen-cloud-assets.js' },
  { name: '项目完整性校验', file: 'tools/validate-project.js' },
  { name: '全功能冒烟测试', file: 'tools/smoke-test.js' }
];
if (!SKIP_CLOUD) steps.push({ name: '云端一致性检查', file: 'tools/verify-cloud.js' });

let failed = 0;
steps.forEach(step => {
  console.log('\n==> ' + step.name);
  const result = spawnSync(process.execPath, [path.join(ROOT, step.file)], {
    cwd: ROOT,
    stdio: 'inherit'
  });
  if (result.status !== 0) failed += 1;
});

console.log('\n========================================');
console.log(failed === 0 ? 'RELEASE_CHECK_OK' : 'RELEASE_CHECK_FAILED: ' + failed);
console.log('========================================');
process.exitCode = failed === 0 ? 0 : 1;

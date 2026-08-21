// 图鉴图标压缩：调色板 PNG 重编码 + 尺寸归一（原位覆盖，文件名不变）。
// 原图源头在 BWIKI，可随时通过 scrape-inventory.js 重新下载，因此覆盖无损。
//
// 用法：node tools/compress-inventory-icons.js [--width 180] [--files a.png,b.png] [--all]
//   --width N   最长边目标像素，默认 180
//   --files     只处理指定文件名（逗号分隔，抽样模式）
//   --all       处理 images/inventory 下全部文件
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'images', 'inventory');
const sharp = require(path.join(ROOT, 'tools', 'node_modules', 'sharp'));

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const widthIdx = args.indexOf('--width');
  const maxWidth = widthIdx >= 0 ? parseInt(args[widthIdx + 1], 10) || 180 : 180;
  const filesIdx = args.indexOf('--files');
  const onlyAll = args.includes('--all');
  const onlyNames = filesIdx >= 0 ? args[filesIdx + 1].split(',').map(s => s.trim()) : null;

  if (!onlyAll && !onlyNames) {
    console.error('请指定 --all 或 --files 文件名列表');
    process.exit(1);
  }

  const all = walk(TARGET_DIR);
  const targets = onlyNames
    ? all.filter(f => onlyNames.includes(path.basename(f)))
    : all;

  if (!targets.length) {
    console.error('未匹配到任何文件');
    process.exit(1);
  }

  let beforeTotal = 0;
  let afterTotal = 0;
  for (const file of targets) {
    const before = fs.statSync(file).size;
    const buffer = await sharp(file)
      .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer();
    // 仅在确实变小或尺寸变化时写回；异常放大则保留原文件
    if (buffer.length < before) {
      fs.writeFileSync(file, buffer);
    }
    const after = Math.min(before, buffer.length);
    beforeTotal += before;
    afterTotal += after;
    const rel = path.relative(TARGET_DIR, file);
    console.log(
      rel.padEnd(40) +
      ' ' + (before / 1024).toFixed(1) + 'KB -> ' + (after / 1024).toFixed(1) + 'KB' +
      (buffer.length >= before ? '（保留原文件）' : '')
    );
  }
  console.log('\n合计: ' + (beforeTotal / 1024).toFixed(0) + 'KB -> ' + (afterTotal / 1024).toFixed(0) + 'KB' +
    '（节省 ' + (100 - afterTotal * 100 / Math.max(1, beforeTotal)).toFixed(0) + '%）');
}

main().catch(err => {
  console.error('压缩失败:', err.message || err);
  process.exit(1);
});

// 从 BWIKI 抓取加页手记图鉴（异象/道具/辞章），与 data/localMapIndex.js 比对：
// 1) 输出新增条目报告（含建议 id 与图标地址）
// 2) 检测现有异象条目的刷新地图变更（如新增"噩梦"难度）
// 本脚本只生成报告与下载图标，不修改索引；合并由人工确认后进行。
//
// 用法：node tools/scrape-inventory.js [--download]
//   --download  同时下载新增条目图标到 images/inventory/<分类>/<id>.png
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://wiki.biligame.com/dwrg/';
const PAGES = [
  { category: 'anomaly', title: '加页手记异象' },
  { category: 'material', title: '加页手记道具' },
  { category: 'chapter', title: '加页手记辞章' }
];

// 已知新条目的 id 建议（异象英文 snake_case / 辞章拼音，沿用各自惯例）
const ID_OVERRIDES = {
  '旗杆阴兵': 'flagstaff_ghost',
  '号角阴兵': 'horn_ghost',
  '厄运之女（异象）': 'doom_lady',
  '读者的揣摩': 'readers_musing',
  '读者的审阅': 'readers_review',
  '拾遗木偶': 'collector_puppet',
  '倾颓书架': 'collapsed_bookshelf',
  '旧日回声': 'past_echo',
  '瓶装幽火': 'pingzhuang_youhuo',
  '舞会面具': 'wuhui_mianju',
  '茶壶': 'chahu',
  '单筒望远镜': 'dantong_wangyuanjing',
  '厄运的馈赠': 'eyun_de_kuizeng',
  '藏宝图': 'cangbaotu',
  '银梳': 'yinshu',
  '水壶': 'shuihu',
  '破损的玩偶': 'posun_de_wanou'
};

const ROOT = path.join(__dirname, '..');

function decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(s) {
  return decodeEntities(
    String(s)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchPage(title) {
  const url = BASE + encodeURIComponent(title);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(title + ' HTTP ' + res.status);
  return { url, html: await res.text() };
}

// 卡片归属的 tab 分组（常规异象/联动异象/常规辞章/联动辞章等）
function extractCards(html) {
  const events = [];
  let m;
  const labelRe = /<span class="tab-panel">([^<]+)<\/span>/g;
  while ((m = labelRe.exec(html))) events.push({ pos: m.index, type: 'label', name: m[1].trim() });
  const contentRe = /<div class="resp-tab-content/g;
  while ((m = contentRe.exec(html))) events.push({ pos: m.index, type: 'content' });
  events.sort((a, b) => a.pos - b.pos);

  const chunks = [];
  let currentLabel = '';
  events.forEach(e => {
    if (e.type === 'label') currentLabel = e.name;
    else chunks.push({ start: e.pos, group: currentLabel });
  });

  const marks = [];
  const cardRe = /<div style="display:inline-block;text-align:left;width:/g;
  while ((m = cardRe.exec(html))) marks.push(m.index);

  return marks.map((pos, i) => {
    let group = '';
    for (const c of chunks) {
      if (c.start <= pos) group = c.group;
      else break;
    }
    const end = i + 1 < marks.length ? marks[i + 1] : html.length;
    return { group, html: html.slice(pos, end) };
  });
}

function parseItemInfo(cardHtml) {
  const m = cardHtml.match(/<span class="iteminfo">([\s\S]*?)<\/span>/);
  if (!m) return null;
  const fields = {};
  m[1].split(/<br\s*\/?>/i).forEach(part => {
    const fm = part.match(/<b>([^<]+)：<\/b>([\s\S]*)/);
    if (fm) fields[fm[1].trim()] = stripTags(fm[2]);
  });
  return fields;
}

function toNumber(s) {
  const n = Number(String(s || '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}

function parseCard(card) {
  const linkM = card.html.match(/<a href="\/dwrg\/[^"]+" title="([^"]+)"/);
  const imgM = card.html.match(/<img[^>]*src="(https:\/\/patchwiki\.biligame\.com[^"]+)"/);
  if (!linkM || !imgM) return null;
  const name = decodeEntities(linkM[1]).replace(/^加页手记\s*/, '').trim();
  const iconUrl = imgM[1].replace('/thumb', '').replace(/\/\d+px-[^/]+$/, '');
  const qM = card.html.match(/(华彩|稀世|奇珍|独特)品质/);
  const quality = qM ? qM[1] : '';
  const fields = parseItemInfo(card.html);
  if (!fields || !name) return null;

  const base = { name, quality, iconUrl, group: card.group };
  if (fields['技能介绍'] !== undefined) {
    return Object.assign(base, {
      category: 'anomaly',
      description: fields['技能介绍'] || '',
      counter: fields['应对方式'] || '',
      maps: (fields['刷新地图'] || '')
        .split(/[,，、]/)
        .map(s => s.trim().replace(/^厄运之女-/, ''))
        .filter(Boolean)
    });
  }
  if (fields['道具效果'] !== undefined) {
    return Object.assign(base, {
      category: 'material',
      type: fields['类型'] || '',
      value: toNumber(fields['价格']),
      weight: fields['重量'] || '',
      durability: fields['耐久'] || '',
      description: fields['道具效果'] || ''
    });
  }
  if (fields['具体描述'] !== undefined) {
    return Object.assign(base, {
      category: 'chapter',
      group: /联动/.test(card.group) ? '联动辞章' : '常规辞章',
      weight: fields['重量'] || '',
      price: toNumber(fields['价格']),
      map: fields['刷新地图'] || '厄运之女',
      description: fields['具体描述'] || ''
    });
  }
  return null;
}

function suggestId(entry, usedIds) {
  if (ID_OVERRIDES[entry.name]) return ID_OVERRIDES[entry.name];
  if (/^[A-Za-z0-9\s-]+$/.test(entry.name)) {
    const slug = entry.name.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (!usedIds.has(slug)) return slug;
  }
  let n = 1;
  while (usedIds.has('review_' + n)) n++;
  return 'review_' + n;
}

async function main() {
  const download = process.argv.includes('--download');
  const index = require(path.join(ROOT, 'data', 'localMapIndex.js'));
  const existingByName = new Map();
  (index.inventoryData || []).forEach(it => existingByName.set(it.name, Object.assign({ category: it.category }, it)));
  (index.chapterData || []).forEach(it => existingByName.set(it.name, Object.assign({ category: it.category }, it)));

  const seen = new Set();
  const parsed = [];
  const sources = [];
  for (const page of PAGES) {
    const { url, html } = await fetchPage(page.title);
    const cards = extractCards(html);
    let ok = 0;
    cards.forEach(card => {
      const entry = parseCard(card);
      if (!entry || entry.category !== page.category) return;
      const key = page.category + ':' + entry.name;
      if (seen.has(key)) return;
      seen.add(key);
      parsed.push(entry);
      ok++;
    });
    sources.push({ category: page.category, title: page.title, url, cardsParsed: cards.length, entriesParsed: ok });
    console.log('[抓取] ' + page.title + ': 卡片 ' + cards.length + ' -> 条目 ' + ok);
  }

  const usedIds = new Set();
  (index.inventoryData || []).concat(index.chapterData || []).forEach(it => usedIds.add(it.id));

  const newEntries = [];
  const existingMapsUpdates = [];
  const existingFieldDiffs = [];

  parsed.forEach(entry => {
    const old = existingByName.get(entry.name);
    if (!old) {
      const id = suggestId(entry, usedIds);
      usedIds.add(id);
      newEntries.push(Object.assign({ suggestedId: id, needsIdReview: /^review_\d+$/.test(id) }, entry));
      return;
    }
    if (entry.category === 'anomaly') {
      const oldMaps = Array.isArray(old.maps) ? old.maps : [];
      const newMaps = entry.maps || [];
      const added = newMaps.filter(d => oldMaps.indexOf(d) < 0);
      if (added.length) existingMapsUpdates.push({ name: entry.name, oldMaps, newMaps, added });
    } else {
      const pairs = entry.category === 'material'
        ? [['quality', 'quality'], ['value', 'value'], ['weight', 'weight'], ['durability', 'durability']]
        : [['quality', 'quality'], ['price', 'price'], ['weight', 'weight']];
      pairs.forEach(([field]) => {
        if (old[field] !== undefined && String(old[field]) !== String(entry[field])) {
          existingFieldDiffs.push({ category: entry.category, name: entry.name, field, oldValue: old[field], newValue: entry[field] });
        }
      });
    }
  });

  const report = {
    scrapedAt: new Date().toISOString(),
    sources,
    counts: { parsed: parsed.length, newEntries: newEntries.length, mapsUpdates: existingMapsUpdates.length, fieldDiffs: existingFieldDiffs.length },
    newEntries,
    existingMapsUpdates,
    existingFieldDiffs
  };

  if (download && newEntries.length) {
    newEntries.forEach(entry => {
      const dir = path.join(ROOT, 'images', 'inventory', entry.category);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, entry.suggestedId + '.png');
      entry.iconFile = 'images/inventory/' + entry.category + '/' + entry.suggestedId + '.png';
    });
    for (const entry of newEntries) {
      const res = await fetch(entry.iconUrl, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        console.warn('[图标] 下载失败 HTTP ' + res.status + ': ' + entry.name);
        entry.iconFile = '';
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(ROOT, entry.iconFile), buf);
      let finalSize = buf.length;
      // 新图标立即压缩归一，避免 BWIKI 原图撑爆主包
      try {
        const { compressOne } = require('./compress-inventory-icons.js');
        finalSize = await compressOne(path.join(ROOT, entry.iconFile), 180);
      } catch (e) {
        console.warn('[图标] 压缩跳过:', e.message || e);
      }
      console.log('[图标] ' + entry.iconFile + ' (' + Math.round(finalSize / 1024) + 'KB)');
    }
  }

  const out = path.join(__dirname, 'scrape-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');
  console.log('\n=== 报告 -> tools/scrape-report.json ===');
  console.log('新增条目: ' + newEntries.length + ' | 现有异象地图变更: ' + existingMapsUpdates.length + ' | 字段差异: ' + existingFieldDiffs.length);
  newEntries.forEach(e => console.log('  [新增] ' + e.category + ' | ' + e.name + ' -> ' + e.suggestedId + (e.needsIdReview ? '（需人工确认 id）' : '')));
  existingMapsUpdates.forEach(u => console.log('  [地图] ' + u.name + ': [' + u.oldMaps.join('/') + '] -> [' + u.newMaps.join('/') + ']'));
}

main().catch(err => {
  console.error('抓取失败:', err.message || err);
  process.exit(1);
});

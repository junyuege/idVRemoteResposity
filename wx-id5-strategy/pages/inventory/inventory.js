const api = require('../../data/api.js');

// 品质 -> 展示文案 / 卡片边框类 / 角标类（独特=蓝、奇珍=紫、稀世=金、华彩=红）
const QUALITY_META = {
  '独特': { label: '独特', borderCls: 'card-rarity-common', chipCls: 'tag-blue' },
  '奇珍': { label: '奇珍', borderCls: 'card-rarity-rare', chipCls: 'tag-purple' },
  '稀世': { label: '稀世', borderCls: 'card-rarity-legendary', chipCls: 'tag-orange' },
  '华彩': { label: '华彩', borderCls: 'card-rarity-epic', chipCls: 'tag-hard' }
};

// 图鉴分类 -> 展示文案 / 角标类（困难异象红、普通物资蓝）
const CATEGORY_META = {
  anomaly: { label: '异象', cls: 'tag-hard' },
  material: { label: '道具', cls: 'tag-blue' },
  chapter: { label: '辞章', cls: 'tag-purple' }
};

const PLACEHOLDER_ICON = '/images/placeholder/item.png';

// 千分位格式化金额
function formatMoney(n) {
  const v = Number(n);
  if (!isFinite(v)) return n == null ? '' : String(n);
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 刷新难度数组 -> 卡片摘要（全难度 / 单一难度 / 多难度拼接）
function mapsSummary(maps) {
  if (!Array.isArray(maps) || !maps.length) return '未知';
  if (maps.length >= 4) return '全难度';
  return maps.join('+');
}

Page({
  data: {
    tabs: [
      { tab: 'anomaly', label: '异象' },
      { tab: 'material', label: '道具' },
      { tab: 'chapter', label: '辞章' }
    ],
    currentTab: 'anomaly',
    items: [],
    allItems: [],
    keyword: '',
    error: '',
    showDetail: false,
    detail: null
  },

  onLoad() {
    try {
      this.loadItems();
    } catch (err) {
      console.error('[inventory] 加载失败', err);
      this.setData({ error: '数据加载失败，请稍后重试', items: [], allItems: [] });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    this.loadItems();
    wx.stopPullDownRefresh();
  },

  // 全量条目 = 图鉴条目（异象 / 道具 / 辞章）
  loadItems() {
    const data = api.getInventoryData().concat(api.getChapterData());
    const items = data.map(it => {
      const category = CATEGORY_META[it.category] || { label: it.category || '', cls: 'tag-normal' };
      const isAnomaly = it.category === 'anomaly';
      if (isAnomaly) {
        // 异象：无稀有度概念，强化版用红框区分，角标留空
        return {
          id: it.id,
          category: it.category,
          name: it.name || '',
          key: (it.name || '') + ' ' + (it.description || '') + ' ' + (it.counter || '') + ' ' + (it.maps || []).join(' '),
          desc: it.description || '',
          icon: it.icon || PLACEHOLDER_ICON,
          borderCls: /强化/.test(it.name || '') ? 'card-rarity-epic' : 'card-rarity-none',
          chipCls: '',
          categoryLabel: category.label,
          categoryCls: category.cls,
          metaText: '⚠️ 刷新：' + mapsSummary(it.maps),
          maps: (it.maps || []).join(' / '),
          counter: it.counter || ''
        };
      }
      // 回收物资/辞章：wiki 品质（独特/奇珍/稀世/华彩）映射边框与角标
      const quality = QUALITY_META[it.quality] || QUALITY_META['独特'];
      return {
        id: it.id,
        category: it.category,
        name: it.name || '',
        key: (it.name || '') + ' ' + (it.description || '') + ' ' + (it.type || '') + ' ' + (it.quality || '') + ' ' + (it.group || ''),
        desc: it.description || '',
        icon: it.icon || PLACEHOLDER_ICON,
        borderCls: quality.borderCls,
        chipCls: quality.chipCls,
        chipLabel: quality.label,
        categoryLabel: category.label,
        categoryCls: category.cls,
        metaText: '💰 ' + formatMoney(it.value != null ? it.value : it.price),
        type: it.type || '',
        value: it.value != null ? it.value : it.price,
        weight: it.weight || '',
        durability: it.durability || '',
        group: it.group || '',
        map: it.map || ''
      };
    });

    this.setData({ allItems: items });
    this.renderItems();
  },

  // 按 分段 tab + 搜索词 过滤渲染
  renderItems() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    let list = (this.data.allItems || []).filter(it => it.category === this.data.currentTab);
    if (kw) {
      list = list.filter(it => (it.key || '').toLowerCase().indexOf(kw) >= 0);
    }
    this.setData({ items: list });
  },

  onTabTap(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab }, () => this.renderItems());
  },

  onSearch(e) {
    this.setData({ keyword: (e.detail.value || '').trim() }, () => this.renderItems());
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => this.renderItems());
  },

  onItemTap(e) {
    const item = this.data.items[e.currentTarget.dataset.index];
    if (!item) return;
    // 图鉴条目 -> 弹出底部抽屉展示详情
    const meta = [];
    if (item.category === 'anomaly') {
      if (item.maps) meta.push({ label: '刷新地图', value: item.maps });
      if (item.counter) meta.push({ label: '应对方式', value: item.counter });
    } else {
      if (item.group) meta.push({ label: '分组', value: item.group });
      if (item.type) meta.push({ label: '类型', value: item.type });
      if (item.value != null) meta.push({ label: '价格', value: '💰 ' + formatMoney(item.value) });
      if (item.weight) meta.push({ label: '重量', value: item.weight });
      if (item.durability) meta.push({ label: '耐久', value: item.durability });
      if (item.map) meta.push({ label: '刷新地图', value: item.map });
    }
    this.setData({ showDetail: true, detail: Object.assign({}, item, { meta: meta }) });
  },

  closeDetail() {
    this.setData({ showDetail: false, detail: null });
  }
});

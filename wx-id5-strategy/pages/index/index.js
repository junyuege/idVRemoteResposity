const api = require('../../data/api.js');

// 难度标签压缩 + 特殊版别名（与样式类的难度顺序一致）
const DIFF_RANK = { newbie: 0, easy: 1, normal: 2, hard: 3, hard_fast: 4 };

function fmtLabel(name) {
  if (!name) return '';
  if (name.indexOf('速刷') > -1) return '困难·速刷';
  if (name.indexOf('全棺') > -1) return '困难·全棺';
  var parts = name.split('·');
  var base = parts[0];
  return base.length > 2 ? base.substring(0, 2) : base;
}

Page({
  data: {
    strategies: [],
    loading: false,
    currentMode: ''
  },

  onLoad() {
    this.loadStrategies();
  },

  loadStrategies() {
    const maps = api.getMaps();
    const strategies = maps.map(m => {
      // 短标签（≤2字：新手/简单/普通）固定在上行，长标签（困难·全棺/困难·速刷）固定在下行；
      // 每组内按难度进阶顺序排列，行内胶囊等宽铺满
      const order = (m.routes || []).map((r, i) => ({
        id: r.id,
        name: r.name,
        label: fmtLabel(r.name),
        __order: i
      })).sort((a, b) => a.label.length - b.label.length || DIFF_RANK[a.id] - DIFF_RANK[b.id] || a.__order - b.__order);
      const shortRoutes = order.filter(r => r.label.length <= 2);
      const longRoutes = order.filter(r => r.label.length > 2);
      return {
        _id: m.id,
        title: m.displayName,
        coverImage: m.coverImage ? m.coverImage : '/images/placeholder/cover.png',
        summary: (m.routes || []).map(r => r.name).join(' / ') + ' 共 ' + (m.routes || []).length + ' 种难度',
        difficultyTag: m.difficulty,
        difficultyTagClass: 'tag-nightmare',
        author: '宝藏房攻略组',
        mapId: m.id,
        routes: order,
        shortRoutes: shortRoutes,
        longRoutes: longRoutes
      };
    });
    // 首页仅展示 SSOT 索引中的地图（当前唯一：厄运之女）
    let list = strategies;
    if (this.data.currentMode) {
      const filtered = strategies.filter(item => item.routes.some(r => r.id === this.data.currentMode));
      if (filtered.length > 0) {
        list = filtered;
      }
    }
    this.setData({ strategies: list, loading: false });
  },

  // 小抄教学按钮 -> 进入教程页（新版小抄看法教学图）
  goToCategory() {
    wx.navigateTo({ url: '/pages/tutorial/tutorial' });
  },

  onStrategyTap(e) {
    const mapId = e.currentTarget.dataset.id;
    // 首页卡片点击 -> 难度版本列表页（四级层级：地图 → 版本 → 形状 → 图）
    wx.navigateTo({ url: '/pages/version/version?mapId=' + mapId });
  },

  onSelectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const mapId = e.currentTarget.dataset.mapid;
    this.setData({ currentMode: mode });
    // 对接原地图页：点击难度 -> 直达对应难度的路线页
    wx.navigateTo({ url: '/pages/route/route?mapId=' + mapId + '&mode=' + mode });
  },

  onShareAppMessage() {
    return {
      title: '第五人格·加页手记攻略查询',
      desc: '地图路线、物资点位、通关技巧一网打尽',
      path: '/pages/index/index'
    };
  }
});
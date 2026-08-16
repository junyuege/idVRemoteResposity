const api = require('../../data/api.js');
const analytics = require('../../utils/analytics.js');

const RECENT_VIEW_KEY = 'id5_recent_view_v1'; // 兼容旧单条记录
const RECENT_HISTORY_KEY = 'id5_recent_history_v1';

// 难度标签压缩 + 特殊版别名（与样式类的难度顺序一致）
const DIFF_RANK = { newbie: 0, easy: 1, normal: 2, hard: 3, special: 4 };

function fmtLabel(name) {
  if (!name) return '';
  if (name.indexOf('速刷') > -1) return '困难·速刷';
  if (name.indexOf('全棺') > -1) return '困难·全棺';
  if (name.indexOf('新版') > -1) return '新版';
  var parts = name.split('·');
  var base = parts[0];
  return base.length > 2 ? base.substring(0, 2) : base;
}

Page({
  data: {
    strategies: [],
    loading: true,
    currentMode: '',
    recent: null,
    recentList: []
  },

  onLoad() {
    this.loadStrategies();
    analytics.track('page_view', 'pages/index/index');
  },

  // 返回首页时清除上次点击的难度筛选，并刷新最近查看卡片。
  onShow() {
    this.setData({ currentMode: '' });
    this.loadStrategies();
  },

  loadStrategies() {
    const maps = api.getMaps();
    const strategies = [];
    maps.forEach(m => {
      // 按作者拆分卡片：同一地图下的「展十版」「凉哈皮版」各自独立成卡
      // 卡片顺序 = 该地图 routes 首次出现的作者顺序（展十版在前）
      const byAuthor = {};
      const authorSeq = [];
      api.getRoutesByMapId(m.id).forEach(r => {
        const a = r.authorId || r.author || 'other';
        (byAuthor[a] = byAuthor[a] || []).push(r);
        if (byAuthor[a].length === 1) authorSeq.push(a);
      });
      authorSeq.forEach(authorId => {
        const authorRoutes = byAuthor[authorId];
        const author = authorRoutes[0].author || '其他';
        // 短标签（≤2字：新手/简单/普通）固定在上行，长标签（困难·全棺/困难·速刷）固定在下行；
        // 每组内按难度进阶顺序排列，行内胶囊等宽铺满
        const order = authorRoutes.map((r, i) => ({
          id: r.id,
          name: r.name,
          label: fmtLabel(r.name),
          difficulty: r.difficulty || r.id,
          __order: i
        })).sort((a, b) => a.label.length - b.label.length || (DIFF_RANK[a.difficulty] == null ? 99 : DIFF_RANK[a.difficulty]) - (DIFF_RANK[b.difficulty] == null ? 99 : DIFF_RANK[b.difficulty]) || a.__order - b.__order);
        const shortRoutes = order.filter(r => r.label.length <= 2);
        const longRoutes = order.filter(r => r.label.length > 2);
        strategies.push({
          _id: m.id + '_' + authorId,
          title: m.displayName + ' · ' + author,
          coverImage: m.coverImage ? m.coverImage : '/images/placeholder/cover.png',
          summary: authorRoutes.map(r => r.name).join(' / ') + ' 共 ' + authorRoutes.length + ' 种难度',
          difficulty: m.difficulty || '攻略地图',
          author: author,
          authorId: authorId,
          mapId: m.id,
          routes: order,
          shortRoutes: shortRoutes,
          longRoutes: longRoutes
        });
      });
    });
    // 首页仅展示 SSOT 索引中的地图（当前唯一：厄运之女）
    let list = strategies;
    if (this.data.currentMode) {
      const filtered = strategies.filter(item => item.routes.some(r => r.id === this.data.currentMode));
      if (filtered.length > 0) {
        list = filtered;
      }
    }
    const recentViews = this.getRecentViews(strategies);
    this.setData({
      strategies: list,
      loading: false,
      recent: recentViews[0] || null,
      recentList: recentViews.slice(0, 5)
    });
  },

  getRecentViews(strategies) {
    let rawList = null;
    try { rawList = wx.getStorageSync(RECENT_HISTORY_KEY) || []; } catch (e) { rawList = []; }
    if (!Array.isArray(rawList)) rawList = [];
    if (!rawList.length) {
      const legacy = wx.getStorageSync(RECENT_VIEW_KEY);
      if (legacy && legacy.routeId) rawList = [legacy];
    }
    return rawList
      .filter(raw => raw && raw.mapId && raw.routeId)
      .map(raw => {
        const strategy = strategies.find(item => item.mapId === raw.mapId && item.routes.some(route => route.id === raw.routeId));
        if (!strategy) return null;
        const parts = [raw.routeName || raw.routeId];
        if (raw.shapeId && raw.shapeId !== '__root__') parts.push(raw.shapeId);
        if (raw.door) parts.push(raw.door);
        if (raw.file) parts.push(raw.file);
        return Object.assign({}, raw, { summary: parts.join(' · '), author: raw.author || strategy.author });
      })
      .filter(Boolean);
  },

  openRecent(raw) {
    if (!raw) return;
    const doorParam = raw.door ? '&door=' + encodeURIComponent(raw.door) : '';
    const fileParam = raw.file ? '&file=' + encodeURIComponent(raw.file) : '';
    wx.navigateTo({
      url: '/pages/detail/detail?mapId=' + encodeURIComponent(raw.mapId) +
        '&routeId=' + encodeURIComponent(raw.routeId) +
        '&shapeId=' + encodeURIComponent(raw.shapeId || '__root__') + doorParam + fileParam
    });
  },

  onRecentTap() {
    this.openRecent(this.data.recent);
  },

  onHistoryTap(e) {
    const raw = this.data.recentList[e.currentTarget.dataset.index];
    this.openRecent(raw);
  },

  clearRecentHistory() {
    try {
      wx.removeStorageSync(RECENT_HISTORY_KEY);
      wx.removeStorageSync(RECENT_VIEW_KEY);
    } catch (e) {}
    this.setData({ recent: null, recentList: [] });
  },

  onPullDownRefresh() {
    this.setData({ loading: true });
    this.loadStrategies();
    wx.stopPullDownRefresh();
  },

  // 小抄教学按钮 -> 进入教程页（新版小抄看法教学图）
  goToCategory() {
    wx.navigateTo({ url: '/pages/tutorial/tutorial' });
  },

  goToInventory() {
    wx.switchTab({ url: '/pages/inventory/inventory' });
  },

  onStrategyTap(e) {
    const mapId = e.currentTarget.dataset.id;
    const authorId = e.currentTarget.dataset.authorid || '';
    wx.navigateTo({
      url: '/pages/explorer/explorer?mapId=' + encodeURIComponent(mapId) +
        '&author=' + encodeURIComponent(authorId)
    });
  },

  onSelectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const mapId = e.currentTarget.dataset.mapid;
    const authorId = e.currentTarget.dataset.authorid || '';
    this.setData({ currentMode: mode });
    wx.navigateTo({
      url: '/pages/explorer/explorer?mapId=' + encodeURIComponent(mapId) +
        '&author=' + encodeURIComponent(authorId) +
        '&routeId=' + encodeURIComponent(mode)
    });
  },

  onShareAppMessage() {
    return {
      title: '第五人格·加页手记攻略查询',
      desc: '地图路线、物资点位、通关技巧一网打尽',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: '第五人格·加页手记攻略查询'
    };
  }
});

const api = require('../../data/api.js');
const analytics = require('../../utils/analytics.js');
const announcement = require('../../utils/announcement.js');

const RECENT_VIEW_KEY = 'id5_recent_view_v1'; // 兼容旧单条记录
const RECENT_HISTORY_KEY = 'id5_recent_history_v1';
const RECENT_LIST_LIMIT = 5; // 历史记录最多展示 5 条
const RECENT_COLLAPSED_COUNT = 2; // 默认只展示 2 条，其余收起

// 难度标签压缩 + 特殊版别名（与样式类的难度顺序一致）
const DIFF_RANK = { newbie: 0, easy: 1, normal: 2, hard: 3, nightmare: 4, special: 5 };
const DIFF_LABEL = { newbie: '新手', easy: '简单', normal: '普通', hard: '困难', nightmare: '噩梦' };

function fmtLabel(name, difficulty) {
  if (!name) return '';
  // 难度字段优先：噩梦路线名可能含"速刷"，不能只按名称子串判断
  if (difficulty && DIFF_LABEL[difficulty]) {
    if (difficulty === 'hard') {
      if (name.indexOf('速刷') > -1) return '困难·速刷';
      if (name.indexOf('全棺') > -1) return '困难·全棺';
      return '困难';
    }
    return DIFF_LABEL[difficulty];
  }
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
    recentHistory: [],
    recentHistoryVisible: [],
    recentExpanded: false,
    showHistory: false,
    announcement: null,
    announcementDismissed: true,
    showAnnouncement: false
  },

  onLoad() {
    this._pendingRecentRefresh = false;
    this.loadStrategies();
    this.loadAnnouncement();
    analytics.track('page_view', 'pages/index/index');
  },

  // 返回首页时清除上次点击的难度筛选。
  // 历史记录仅在从本页跳走过时才重读 storage（详情页会写入新记录），
  // 其余 onShow（如下拉刷新、弹层关闭）复用内存数据，避免启动路径冗余同步读。
  onShow() {
    const needRefresh = this._pendingRecentRefresh === true;
    this._pendingRecentRefresh = false;
    if (needRefresh) {
      this.setData({ currentMode: '' });
      this.loadStrategies();
    } else {
      this.setData({ currentMode: '' });
    }
  },

  // 公告：异步加载不阻塞首页；云不可用/无公告时静默。
  loadAnnouncement() {
    announcement.fetchActive().then(item => {
      if (!item || !item._id) {
        this.setData({ announcement: null, showAnnouncement: false });
        return;
      }
      const dismissed = announcement.isDismissed(item);
      const patch = { announcement: item, announcementDismissed: dismissed };
      // 首次可见时自动弹一次详情（内容更新后会重新弹出）
      if (!dismissed && !announcement.isRead(item)) {
        patch.showAnnouncement = true;
        announcement.markRead(item._id);
      }
      this.setData(patch);
    });
  },

  openAnnouncement() {
    if (!this.data.announcement) return;
    this.setData({ showAnnouncement: true });
    announcement.markRead(this.data.announcement._id);
  },

  closeAnnouncement() {
    this.setData({ showAnnouncement: false });
  },

  dismissAnnouncement() {
    if (!this.data.announcement) return;
    announcement.dismiss(this.data.announcement._id);
    this.setData({ announcementDismissed: true, showAnnouncement: false });
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
          label: fmtLabel(r.name, r.difficulty),
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
    // 历史记录不再占据首页主内容，只作为浮动按钮 + 底部半屏面板展示。
    const recentViews = this.getRecentViews(strategies);
    const recentHistory = recentViews.slice(0, RECENT_LIST_LIMIT);
    this.setData({
      strategies: list,
      loading: false,
      recentHistory: recentHistory,
      recentHistoryVisible: recentHistory.slice(0, RECENT_COLLAPSED_COUNT),
      recentExpanded: false
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
    this._pendingRecentRefresh = true;
    const doorParam = raw.door ? '&door=' + encodeURIComponent(raw.door) : '';
    const fileParam = raw.file ? '&file=' + encodeURIComponent(raw.file) : '';
    wx.navigateTo({
      url: '/pages/detail/detail?mapId=' + encodeURIComponent(raw.mapId) +
        '&routeId=' + encodeURIComponent(raw.routeId) +
        '&shapeId=' + encodeURIComponent(raw.shapeId || '__root__') + doorParam + fileParam
    });
  },

  openHistorySheet() {
    this.setData({
      showHistory: true,
      recentExpanded: false,
      recentHistoryVisible: this.data.recentHistory.slice(0, RECENT_COLLAPSED_COUNT)
    });
  },

  closeHistorySheet() {
    this.setData({ showHistory: false });
  },

  preventClose() {},

  onHistoryTap(e) {
    const raw = this.data.recentHistoryVisible[e.currentTarget.dataset.index];
    if (!raw) return;
    this.closeHistorySheet();
    this.openRecent(raw);
  },

  toggleRecentHistory() {
    const expanded = !this.data.recentExpanded;
    this.setData({
      recentExpanded: expanded,
      recentHistoryVisible: expanded ? this.data.recentHistory : this.data.recentHistory.slice(0, RECENT_COLLAPSED_COUNT)
    });
  },

  clearRecentHistory() {
    try {
      wx.removeStorageSync(RECENT_HISTORY_KEY);
      wx.removeStorageSync(RECENT_VIEW_KEY);
    } catch (e) {}
    this.setData({
      recentHistory: [],
      recentHistoryVisible: [],
      recentExpanded: false,
      showHistory: false
    });
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
    this._pendingRecentRefresh = true;
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
    this._pendingRecentRefresh = true;
    // 跳转动画期间就提前下载分包并预取临时链接，让查询页和详情页更快。
    api.loadRoutePackage(mode);
    api.prefetchRouteImageUrls(mapId, mode);
    api.prefetchIconUrls(mapId, mode);
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

const api = require('../../data/api.js');

Page({
  data: {
    strategies: [],
    loading: false,
    currentMode: ''
  },

  onLoad() {
    this.loadStrategies();
  },

  onShow() {
    const app = getApp();
    // 从地图页带模式过来
    if (app.globalData.pendingMode) {
      this.setData({ currentMode: app.globalData.pendingMode });
      app.globalData.pendingMode = '';
      this.loadStrategies();
    }
  },

  loadStrategies() {
    const maps = api.getMaps();
    const strategies = maps.map(m => ({
      _id: m.id,
      title: m.displayName,
      coverImage: m.coverImage ? m.coverImage : '/images/placeholder/cover.png',
      summary: m.routes.map(r => r.name).join(' / ') + ' 共 ' + m.routes.length + ' 种难度',
      difficultyTag: m.difficulty,
      difficultyTagClass: 'tag-nightmare',
      author: '宝藏房攻略组',
      mapId: m.id,
      routes: m.routes
    }));
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

  goToCategory() { wx.switchTab({ url: '/pages/category/category' }); },
  goToInventory() { wx.switchTab({ url: '/pages/inventory/inventory' }); },

  onStrategyTap(e) {
    const mapId = e.currentTarget.dataset.id;
    // 首页卡片点击 -> 进入路线页（route 页承载形状列表），携带 mapId
    wx.navigateTo({ url: '/pages/route/route?mapId=' + mapId });
  },

  onShareAppMessage() {
    return {
      title: '第五人格·加页手记攻略查询',
      desc: '地图路线、物资点位、通关技巧一网打尽',
      path: '/pages/index/index'
    };
  }
});
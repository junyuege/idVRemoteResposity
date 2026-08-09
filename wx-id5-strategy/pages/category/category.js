const api = require('../../data/api.js');

// UI 三个模式 tab 与 SSOT 索引中 difficulty 的映射
// 全棺模式 = 困难（全棺版）路线
const MODE_MAP = {
  simple: 'easy',
  hard: 'hard',
  nightmare: 'hard'
};

Page({
  data: { currentMode: "hard" },

  onLoad(options) {
    // 允许以 ?mapId= 直达（保留第一次进入的可塑性），否则使用唯一地图
    const maps = api.getMaps();
    this.setData({ mapId: (options && options.mapId) || (maps[0] && maps[0].id) || '' });
  },

  onModeTap(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ currentMode: mode });
    // 跳转到路线形状选择页，携带 mapId 与映射后的难度
    wx.navigateTo({
      url: '/pages/route/route?mapId=' + this.data.mapId + '&mode=' + (MODE_MAP[mode] || mode)
    });
  }
});
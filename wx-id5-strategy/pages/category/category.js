const api = require('../../data/api.js');

Page({
  data: {
    maps: [],
    currentMode: ''
  },

  onLoad(options) {
    const maps = api.getMaps();
    this.setData({
      maps: maps.map(m => ({
        id: m.id,
        displayName: m.displayName,
        difficulty: m.difficulty,
        routes: m.routes.map(r => ({ id: r.id, name: r.name }))
      })),
      mapId: (options && options.mapId) || (maps[0] && maps[0].id) || ''
    });
  },

  onModeTap(e) {
    const mapId = e.currentTarget.dataset.mapid;
    const routeId = e.currentTarget.dataset.routeid;
    this.setData({ currentMode: routeId });
    wx.navigateTo({
      url: '/pages/route/route?mapId=' + mapId + '&mode=' + routeId
    });
  }
});
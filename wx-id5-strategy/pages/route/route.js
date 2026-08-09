const api = require('../../data/api.js');

Page({
  data: {
    routes: [],
    routeId: '',
    modeName: '',
    loading: true
  },

  onLoad(options) {
    const maps = api.getMaps();
    const defaultMapId = (maps[0] && maps[0].id) || '';
    const mapId = options.mapId || defaultMapId;
    const routeId = options.mode || '';
    const map = api.getMapById(mapId);
    const routes = api.getRoutesByMapId(mapId);
    const route = routes.find(r => r.id === routeId) || routes[0] || null;

    const shapeList = [];
    if (route) {
      const shapes = api.getShapes(mapId, route.id);
      shapes.forEach((shape, i) => {
        const detail = api.getShapeDetails(mapId, route.id, shape);
        const doorNames = detail ? (detail.doors || []).map(d => d.door) : [];
        const imgCount = detail ? detail.doors.reduce((n, d) => n + (d.files || []).length, 0) : 0;
        shapeList.push({
          id: String(i),
          shape: shape,
          title: doorNames.length ? doorNames.join(' / ') : '路线图',
          desc: doorNames.length + ' 个侧门入口 · ' + imgCount + ' 张图',
          mapName: (map && map.displayName) || '',
          shapeId: shape,
          mapId: map ? map.id : '',
          routeId: route.id
        });
      });
      // 没有形状但根目录有整图（如新手模式）：合成一个入口
      const rootFiles = api.getRootImages(mapId, route.id);
      if (!shapeList.length && rootFiles.length) {
        shapeList.push({
          id: 'root',
          shape: '整图',
          title: '完整路线图',
          desc: rootFiles.length + ' 张 · 点击查看全图',
          mapName: (map && map.displayName) || '',
          shapeId: '__root__',
          mapId: mapId,
          routeId: route.id
        });
      }
    }

    this.setData({
      routes: shapeList,
      routeId: route ? route.id : '',
      modeName: route ? route.name + '模式' : '',
      loading: false
    });
  },

  onRouteTap(e) {
    const item = this.data.routes[e.currentTarget.dataset.id];
    if (!item) return;
    wx.navigateTo({
      url: '/pkg-' + item.routeId + '/pages/detail/detail?mapId=' + item.mapId + '&routeId=' + item.routeId + '&shapeId=' + encodeURIComponent(item.shapeId)
    });
  }
});
const api = require('../../data/api.js');

Page({
  data: {
    routes: [],
    routeId: '',
    modeName: '',
    loading: true,
    error: ''
  },

  onLoad(options) {
    this._lastOptions = options || {};
    try {
      const maps = api.getMaps();
      const defaultMapId = (maps[0] && maps[0].id) || '';
      const mapId = options.mapId || defaultMapId;
      const routeId = options.mode || '';

      if (!mapId) {
        this.showError('暂无攻略数据，请稍后再试');
        return;
      }

      const map = api.getMapById(mapId);
      const routes = api.getRoutesByMapId(mapId);
      if (!routes || !routes.length) {
        this.showError('该地图暂无难度路线数据');
        return;
      }

      const route = routes.find(r => r.id === routeId) || routes[0] || null;
      const shapeList = [];
      if (route) {
        const shapes = api.getShapes(mapId, route.id) || [];
        shapes.forEach((shape, i) => {
          const detail = api.getShapeDetails(mapId, route.id, shape);
          const doors = detail && Array.isArray(detail.doors) ? detail.doors : [];
          const doorNames = doors.map(d => d.door).filter(Boolean);
          const shapeRootFiles = detail && Array.isArray(detail.rootFiles) ? detail.rootFiles : [];
          const imgCount = doors.reduce((n, d) => n + ((d.files && d.files.length) || 0), 0) + shapeRootFiles.length;
          shapeList.push({
            id: String(i),
            shape: shape,
            title: doorNames.length ? doorNames.join(' / ') : '路线图',
            desc: doorNames.length + ' 个侧门入口 · ' + imgCount + ' 张图',
            mapName: (map && map.displayName) || '',
            shapeId: shape,
            mapId: map.id,
            routeId: route.id
          });
        });

        // 没有形状但根目录有整图（如新手模式）：合成一个入口
        const rootFiles = api.getRootImages(mapId, route.id) || [];
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
        error: '',
        loading: false
      });
    } catch (err) {
      console.error('[route] 加载失败', err);
      this.showError('数据加载失败，请稍后重试');
    }
  },

  showError(msg) {
    this.setData({ error: msg, loading: false, routes: [] });
    wx.showToast({ title: msg, icon: 'none' });
  },

  onRetry() {
    if (!this._lastOptions) return;
    this.setData({ loading: true, error: '' });
    this.onLoad(this._lastOptions);
  },

  onRouteTap(e) {
    const item = this.data.routes[e.currentTarget.dataset.index];
    if (!item) return;
    // 形状 -> 侧门选择页（四级层级：地图 → 版本 → 形状 → 侧门 → 图）
    wx.navigateTo({
      url: '/pages/door/door?mapId=' + item.mapId + '&routeId=' + item.routeId + '&shapeId=' + encodeURIComponent(item.shapeId)
    });
  }
});
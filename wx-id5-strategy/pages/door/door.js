const api = require('../../data/api.js');

Page({
  data: {
    loading: true,
    error: '',
    title: '',
    doors: []
  },

  onLoad(options) {
    this._lastOptions = options || {};
    try {
      const maps = api.getMaps();
      const defaultMapId = (maps[0] && maps[0].id) || '';
      const mapId = options.mapId || defaultMapId;
      const routeId = options.routeId || '';
      const shapeId = decodeURIComponent(options.shapeId || '');
      const route = api.getRoute(mapId, routeId);

      if (!mapId || !routeId) {
        this.showError('缺少必要的参数，无法加载');
        return;
      }
      if (!route) {
        this.showError('未找到对应的攻略数据');
        return;
      }

      const isRoot = !shapeId || shapeId === '__root__';
      const detail = isRoot ? null : api.getShapeDetails(mapId, routeId, shapeId);
      const doors = detail ? (Array.isArray(detail.doors) ? detail.doors : []) : [];
      const rootFiles = detail ? (Array.isArray(detail.rootFiles) ? detail.rootFiles : []) : [];

      const list = [];
      if (doors.length) {
        doors.forEach(d => {
          const n = (d.files && d.files.length) || 0;
          list.push({
            door: d.door,
            icon: '🚪',
            desc: n + ' 张路线图',
            mapId: mapId,
            routeId: routeId,
            shapeId: shapeId
          });
        });
      }
      if (rootFiles.length) {
        list.push({
          door: '散图',
          icon: '📄',
          desc: rootFiles.length + ' 张散图',
          mapId: mapId,
          routeId: routeId,
          shapeId: shapeId
        });
      }
      if (!list.length) {
        // 无侧门结构的形状（如新手整图）合成单入口
        list.push({
          door: '完整路线图',
          icon: '🗺️',
          desc: '点击查看全图',
          mapId: mapId,
          routeId: routeId,
          shapeId: isRoot ? '__root__' : shapeId
        });
      }

      wx.setNavigationBarTitle({ title: shapeId ? shapeId + ' 型 · 选择侧门' : '选择侧门' });
      this.setData({
        doors: list,
        title: (isRoot ? '完整路线' : shapeId + ' 型路线') + ' · 选择入口',
        error: '',
        loading: false
      });
    } catch (err) {
      console.error('[door] 加载失败', err);
      this.showError('数据加载失败，请稍后重试');
    }
  },

  showError(msg) {
    this.setData({ error: msg, loading: false, doors: [] });
    wx.showToast({ title: msg, icon: 'none' });
  },

  onRetry() {
    if (!this._lastOptions) return;
    this.setData({ loading: true, error: '' });
    this.onLoad(this._lastOptions);
  },

  onDoorTap(e) {
    const item = this.data.doors[e.currentTarget.dataset.index];
    if (!item) return;
    const isRootShape = item.shapeId === '__root__';
    const doorParam = item.door && item.door !== '完整路线图' ? '&door=' + encodeURIComponent(item.door) : '';
    const shapeParam = isRootShape ? '__root__' : item.shapeId;
    wx.navigateTo({
      url: '/pages/detail/detail?mapId=' + item.mapId +
        '&routeId=' + item.routeId + '&shapeId=' + encodeURIComponent(shapeParam) + doorParam
    });
  }
});

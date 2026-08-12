const api = require('../../data/api.js');

// 难度版本排序（与首页胶囊一致）：新手 < 简单 < 普通 < 困难全棺 < 困难速刷
const DIFF_RANK = { newbie: 0, easy: 1, normal: 2, hard: 3, hard_fast: 4 };

function fmtLabel(name) {
  if (!name) return '';
  if (name.indexOf('速刷') > -1) return '困难·速刷';
  if (name.indexOf('全棺') > -1) return '困难·全棺';
  var parts = name.split('·');
  var base = parts[0];
  return base.length > 2 ? base.substring(0, 2) : base;
}

// 统计某版本下的形状数 / 图片数
function countShapesAndImages(mapId, route) {
  const shapes = api.getShapes(mapId, route.id) || [];
  let imgCount = 0;
  shapes.forEach(shape => {
    const detail = api.getShapeDetails(mapId, route.id, shape);
    if (detail) {
      imgCount += (detail.rootFiles || []).length;
      (detail.doors || []).forEach(d => {
        imgCount += (d.files || []).length;
      });
    }
  });
  imgCount += (route.rootFiles || []).length;
  return { shapeCount: shapes.length, imgCount: imgCount };
}

Page({
  data: {
    loading: true,
    error: '',
    mapName: '',
    versions: []
  },

  onLoad(options) {
    this._lastOptions = options || {};
    try {
      const maps = api.getMaps();
      const defaultMapId = (maps[0] && maps[0].id) || '';
      const mapId = options.mapId || defaultMapId;
      const map = api.getMapById(mapId);
      const routes = api.getRoutesByMapId(mapId);
      if (!routes || !routes.length) {
        this.showError('该地图暂无难度版本数据');
        return;
      }

      const versions = routes
        .map(route => {
          const counts = countShapesAndImages(mapId, route);
          return {
            id: route.id,
            name: route.name || '',
            label: fmtLabel(route.name),
            folder: route.shapeDir || '',
            shapeCount: counts.shapeCount,
            imgCount: counts.imgCount,
            desc: counts.shapeCount > 0
              ? counts.shapeCount + ' 种形状 · ' + counts.imgCount + ' 张图'
              : counts.imgCount + ' 张整图'
          };
        })
        .sort((a, b) => (DIFF_RANK[a.id] != null ? DIFF_RANK[a.id] : 99) - (DIFF_RANK[b.id] != null ? DIFF_RANK[b.id] : 99));

      wx.setNavigationBarTitle({ title: (map && map.displayName) || '难度版本' });
      this.setData({ mapId: mapId, versions, mapName: (map && map.displayName) || '', error: '', loading: false });
    } catch (err) {
      console.error('[version] 加载失败', err);
      this.showError('数据加载失败，请稍后重试');
    }
  },

  showError(msg) {
    this.setData({ error: msg, loading: false, versions: [] });
    wx.showToast({ title: msg, icon: 'none' });
  },

  onRetry() {
    if (!this._lastOptions) return;
    this.setData({ loading: true, error: '' });
    this.onLoad(this._lastOptions);
  },

  onVersionTap(e) {
    const item = this.data.versions[e.currentTarget.dataset.index];
    if (!item) return;
    wx.navigateTo({ url: '/pages/route/route?mapId=' + this.data.mapId + '&mode=' + item.id });
  }
});

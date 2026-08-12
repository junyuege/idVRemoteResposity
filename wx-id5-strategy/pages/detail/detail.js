const api = require('../../data/api.js');

// 难度 -> 样式类映射（复用既有 wxss 类名，不新增样式）
const TAG_CLASS = {
  hard: 'tag-hard',
  hard_fast: 'tag-hard',
  normal: 'tag-normal',
  easy: 'tag-easy',
  newbie: 'tag-nightmare'
};

Page({
  data: { strategy: null, loading: true, error: '', strategyId: "" },

  onLoad(options) {
    this._lastOptions = options || {};
    try {
      const maps = api.getMaps();
      const defaultMapId = (maps[0] && maps[0].id) || '';
      const mapId = options.mapId || defaultMapId;
      const routeId = options.routeId || '';
      const shapeId = decodeURIComponent(options.shapeId || '');
      const door = options.door ? decodeURIComponent(options.door) : '';

      if (!mapId || !routeId) {
        this.showError('缺少必要的参数，无法加载攻略');
        return;
      }

      const map = api.getMapById(mapId);
      const route = api.getRoute(mapId, routeId);
      if (!map || !route) {
        this.showError('未找到对应的攻略数据');
        return;
      }

      const hasShape = !!shapeId && shapeId !== '__root__';
      const detail = hasShape ? api.getShapeDetails(mapId, routeId, shapeId) : null;
      const doors = detail ? (Array.isArray(detail.doors) ? detail.doors : []) : [];
      const shapeRootFiles = detail ? (Array.isArray(detail.rootFiles) ? detail.rootFiles : []) : [];

      // 未命中形状时，兜底展示该路线根目录散图（如新手模式）
      const rootImages = api.getRootImageUrls(mapId, routeId);
      const shapeImages = hasShape ? api.getImagesForShape(mapId, routeId, shapeId) : [];

      // 指定了形状但索引中不存在 -> 友好提示
      if (hasShape && !detail) {
        this.showError('该形状暂未收录，看看其他路线吧');
        return;
      }

      // 指定了侧门（或散图）-> 仅展示该入口的图片
      let images = shapeImages;
      if (door) {
        if (door === '散图') {
          images = hasShape ? api.getShapeRootImageUrls(mapId, routeId, shapeId) : rootImages;
        } else {
          const doorDetail = (doors || []).find(d => d.door === door);
          images = doorDetail && hasShape
            ? (doorDetail.files || []).map(f => api.buildImageUrl(mapId, routeId, shapeId, door, f))
            : [];
        }
      }
      if (!images.length && rootImages.length) {
        images = rootImages;
      }

      this._lastDoor = door;
      this._lastMapId = mapId;
      this._rootImages = rootImages;

      const summaryParts = [];
      if (door) {
        summaryParts.push('入口「' + door + '」· ' + images.length + ' 张');
      } else {
        if (doors.length) summaryParts.push(doors.map(d => d.door).join(' / ') + ' 共 ' + doors.length + ' 个入口');
        if (shapeRootFiles.length) summaryParts.push('散图 ' + shapeRootFiles.length + ' 张');
      }

      // 云 fileID -> https 临时链接（带缓存；失败回退原值，不阻塞渲染）
      api.resolveImageUrls(images).then(resolved => {
        this.render(resolved, map, hasShape, shapeId, route, doors, shapeRootFiles, summaryParts);
      });
    } catch (err) {
      console.error('[detail] 加载失败', err);
      this.showError('数据加载失败，请稍后重试');
    }
  },

  render(images, map, hasShape, shapeId, route, doors, shapeRootFiles, summaryParts) {
    const rootImages = this._rootImages || [];
    const contentLines = [];
    contentLines.push('【' + (hasShape ? (shapeId + ' 型路线') : '整图路线') + '】');
    contentLines.push('地图：' + (map.displayName || ''));
    contentLines.push('难度：' + (route.name || ''));
    contentLines.push('');
    if (this._lastDoor) {
      contentLines.push('侧门入口「' + this._lastDoor + '」：' + images.length + ' 张路线图');
    } else if (doors.length) {
      doors.forEach(d => {
        contentLines.push('侧门入口「' + d.door + '」：' + ((d.files && d.files.length) || 0) + ' 张路线图');
      });
    }
    if (!this._lastDoor && shapeRootFiles.length) {
      contentLines.push('形状根目录散图 ' + shapeRootFiles.length + ' 张');
    }
    if (!doors.length && !shapeRootFiles.length) {
      if (rootImages.length) {
        contentLines.push('本难度包含整图路线 ' + rootImages.length + ' 张');
      } else {
        contentLines.push('该形状暂无图片素材，仅有编号信息');
      }
    }
    contentLines.push('');
    contentLines.push('提示：点击图片可全屏预览');

    this.setData({
      strategy: {
        title: (map ? map.displayName : '') + ' · ' + (hasShape ? (shapeId + ' 型路线') : '完整路线图'),
        mapName: (map && map.displayName) || '',
        difficultyTag: (route && route.name) || '',
        difficultyTagClass: TAG_CLASS[route.id] || 'tag-normal',
        author: '宝藏房攻略组',
        summary: summaryParts.length ? summaryParts.join(' · ') : '进入查看全图路线',
        content: contentLines.join('\n'),
        coverImage: (map && map.coverImage) || '/images/placeholder/cover.png',
        images: images
      },
      strategyId: this._lastMapId + '/' + route.id + '/' + (hasShape ? shapeId : '__root__'),
      error: '',
      loading: false
    });
  },

  showError(msg) {
    this.setData({ error: msg, loading: false, strategy: null });
    wx.showToast({ title: msg, icon: 'none' });
  },

  onRetry() {
    if (!this._lastOptions) return;
    this.setData({ loading: true, error: '' });
    this.onLoad(this._lastOptions);
  },

  onShareAppMessage() {
    const s = this.data.strategy;
    if (s) {
      const parts = this.data.strategyId.split('/');
      return {
        title: s.title + " - 加页手记攻略",
        desc: "加页手记·厄运之女路线图",
        path: "/pages/detail/detail?mapId=" + parts[0] +
              "&routeId=" + parts[1] +
              "&shapeId=" + encodeURIComponent(parts[2])
      };
    }
    return {
      title: "第五人格·加页手记攻略",
      path: "/pages/index/index"
    };
  },

  onImageError(e) {
    const src = e.currentTarget.dataset.src || '';
    console.error('[detail] 图片加载失败:', src, e.detail && e.detail.errMsg);
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = this.data.strategy.images;
    if (!imgs || !imgs[idx]) return;
    wx.previewImage({ current: imgs[idx], urls: imgs });
  }
});
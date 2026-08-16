const api = require('../../data/api.js');
const analytics = require('../../utils/analytics.js');

const RECENT_VIEW_KEY = 'id5_recent_view_v1'; // 旧版单条记录，读取后迁移
const RECENT_HISTORY_KEY = 'id5_recent_history_v1';
const RECENT_HISTORY_LIMIT = 10;

// 难度 -> 样式类映射（复用既有 wxss 类名，不新增样式）
const TAG_CLASS = {
  hard: 'tag-hard',
  hard_fast: 'tag-hard',
  normal: 'tag-normal',
  easy: 'tag-easy',
  newbie: 'tag-nightmare'
};

Page({
  data: { strategy: null, loading: true, error: '', strategyId: '' },

  onLoad(options) {
    this._lastOptions = options || {};
    try {
      const maps = api.getMaps();
      const defaultMapId = (maps[0] && maps[0].id) || '';
      const mapId = options.mapId || defaultMapId;
      const routeId = options.routeId || '';
      const shapeId = decodeURIComponent(options.shapeId || '');
      const door = options.door ? decodeURIComponent(options.door) : '';
      const file = options.file ? decodeURIComponent(options.file) : '';

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

      // 指定了识别图 -> 仅展示对应单张
      let images = shapeImages;
      if (file) {
        if (!hasShape) {
          this.showError('识别图需要对应路线形状');
          return;
        }
        const fileIndex = shapeRootFiles.findIndex(f => String(f).toLowerCase() === String(file).toLowerCase());
        if (fileIndex < 0) {
          this.showError('未找到对应的识别图');
          return;
        }
        const rootUrls = api.getShapeRootImageUrls(mapId, routeId, shapeId);
        images = [rootUrls[fileIndex]];
      } else if (door) {
        if (door === '散图') {
          images = hasShape ? api.getShapeRootImageUrls(mapId, routeId, shapeId) : rootImages;
        } else {
          const doorDetail = (doors || []).find(d => d.door === door);
          if (!doorDetail || !hasShape) {
            this.showError('未找到对应的侧门入口');
            return;
          }
          images = (doorDetail.files || []).map(f => api.buildImageUrl(mapId, routeId, shapeId, door, f));
        }
      }
      if (!hasShape && !images.length && rootImages.length) {
        images = rootImages;
      }

      this._lastDoor = door;
      this._lastFile = file;
      this._lastMapId = mapId;
      // 旧分享链接可以用 legacyIds 解析，后续再次分享时统一输出新的唯一 ID。
      this._lastRouteId = route.id;
      this._lastShapeId = hasShape ? shapeId : '__root__';
      this._rootImages = rootImages;

      const summaryParts = [];
      if (file) {
        summaryParts.push('识别图「' + file + '」· ' + images.length + ' 张');
      } else if (door) {
        summaryParts.push('入口「' + door + '」· ' + images.length + ' 张');
      } else {
        if (doors.length) summaryParts.push(doors.map(d => d.door).join(' / ') + ' 共 ' + doors.length + ' 个入口');
        if (shapeRootFiles.length) summaryParts.push('散图 ' + shapeRootFiles.length + ' 张');
      }

      // 先准备本地分包，再解析云链接；任一来源失败都不会中断页面。
      api.loadRoutePackage(routeId).then(() => api.resolveImageUrls(images)).then(resolved => {
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
    if (this._lastFile) {
      contentLines.push('识别图「' + this._lastFile + '」：' + images.length + ' 张路线图');
    } else if (this._lastDoor) {
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
    const imageItems = images.map((url, index) => ({ url, index: index + 1, failed: false }));

    this.setData({
      strategy: {
        title: (map ? map.displayName : '') + ' · ' + (hasShape ? (shapeId + ' 型路线') : '完整路线图'),
        mapName: (map && map.displayName) || '',
        difficultyTag: (route && route.name) || '',
        difficultyTagClass: TAG_CLASS[route.difficulty || route.id] || 'tag-normal',
        author: (route && route.author) || '展十版',
        summary: summaryParts.length ? summaryParts.join(' · ') : '进入查看全图路线',
        content: contentLines.join('\n'),
        coverImage: (map && map.coverImage) || '/images/placeholder/cover.png',
        images: images,
        imageItems: imageItems
      },
        strategyId: this._lastMapId + '/' + (route.authorId || 'other') + '/' + route.id + '/' + (hasShape ? shapeId : '__root__'),
      error: '',
      loading: false
    });
    this.saveRecentView(map, route, hasShape ? shapeId : '__root__', this._lastDoor || '', this._lastFile || '');
    analytics.track('page_view', 'pages/detail/detail', {
      mapId: this._lastMapId,
      routeId: route.id,
      shapeId: hasShape ? shapeId : '__root__'
    });
  },

  saveRecentView(map, route, shapeId, door, file) {
    try {
      let list = wx.getStorageSync(RECENT_HISTORY_KEY) || [];
      if (!Array.isArray(list)) list = [];
      // 迁移旧版单条记录
      let legacy = null;
      if (!list.length) {
        legacy = wx.getStorageSync(RECENT_VIEW_KEY) || null;
        if (legacy && legacy.routeId) list = [legacy];
      }
      const entry = {
        mapId: map && map.id,
        mapName: (map && map.displayName) || '',
        routeId: route && route.id,
        routeName: (route && route.name) || '',
        author: (route && route.author) || '',
        shapeId: shapeId || '__root__',
        door: door || '',
        file: file || '',
        ts: Date.now()
      };
      const entryKey = [entry.mapId, entry.routeId, entry.shapeId, entry.door, entry.file].join('|');
      list = list.filter(item => [item.mapId, item.routeId, item.shapeId, item.door, item.file].join('|') !== entryKey);
      list.unshift(entry);
      list = list.slice(0, RECENT_HISTORY_LIMIT);
      wx.setStorageSync(RECENT_HISTORY_KEY, list);
      if (legacy) wx.removeStorageSync(RECENT_VIEW_KEY);
    } catch (e) {
      console.warn('[detail] 保存最近查看失败', e);
    }
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
      return {
        title: s.title + " - 加页手记攻略",
        desc: "加页手记·厄运之女路线图",
        path: "/pages/detail/detail?" + this.buildDetailQuery()
      };
    }
    return {
      title: "第五人格·加页手记攻略",
      path: "/pages/index/index"
    };
  },

  buildDetailQuery() {
    const doorParam = this._lastDoor ? '&door=' + encodeURIComponent(this._lastDoor) : '';
    const fileParam = this._lastFile ? '&file=' + encodeURIComponent(this._lastFile) : '';
    return 'mapId=' + encodeURIComponent(this._lastMapId) +
      '&routeId=' + encodeURIComponent(this._lastRouteId) +
      '&shapeId=' + encodeURIComponent(this._lastShapeId) + doorParam + fileParam;
  },

  onShareTimeline() {
    const s = this.data.strategy;
    if (s) {
      return {
        title: s.title + ' - 加页手记攻略',
        query: this.buildDetailQuery()
      };
    }
    return {
      title: '第五人格·加页手记攻略'
    };
  },

  onImageError(e) {
    const index = Number(e.currentTarget.dataset.index);
    const src = e.currentTarget.dataset.src || '';
    console.error('[detail] 图片加载失败:', src, e.detail && e.detail.errMsg);
    analytics.track('image_failed', 'pages/detail/detail', {
      mapId: this._lastMapId,
      routeId: this._lastRouteId,
      index: isNaN(index) ? -1 : index,
      src: String(src).slice(0, 200)
    });
    if (!isNaN(index)) {
      this.setData({ ['strategy.imageItems[' + index + '].failed']: true });
    }
  },

  onImageRetry(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (isNaN(index)) return;
    this.setData({ ['strategy.imageItems[' + index + '].failed']: false });
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = this.data.strategy && this.data.strategy.images;
    if (!imgs || !imgs[idx]) return;
    wx.previewImage({ current: imgs[idx], urls: imgs });
  }
});

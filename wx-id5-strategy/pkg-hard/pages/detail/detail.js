const api = require('../../../data/api.js');

// 难度 -> 样式类映射（复用既有 wxss 类名，不新增样式）
const TAG_CLASS = {
  hard: 'tag-hard',
  normal: 'tag-normal',
  easy: 'tag-easy',
  newbie: 'tag-nightmare'
};

Page({
  data: { strategy: null, loading: true, strategyId: "" },

  onLoad(options) {
    const maps = api.getMaps();
    const defaultMapId = (maps[0] && maps[0].id) || '';
    const mapId = options.mapId || defaultMapId;
    const routeId = options.routeId || '';
    const shapeId = decodeURIComponent(options.shapeId || '');

    const map = api.getMapById(mapId);
    const route = api.getRoute(mapId, routeId);
    const hasShape = !!shapeId && shapeId !== '__root__';
    const detail = hasShape ? api.getShapeDetails(mapId, routeId, shapeId) : null;
    const doors = detail ? (detail.doors || []) : [];

    // 未命中形状时，兜底展示该路线根目录散图（如新手模式）
    const rootImages = api.getRootImageUrls(mapId, routeId);
    const shapeImages = hasShape ? api.getImagesForShape(mapId, routeId, shapeId) : [];

    const contentLines = [];
    contentLines.push('【' + (hasShape ? (shapeId + ' 型路线') : '整图路线') + '】');
    contentLines.push('地图：' + ((map && map.displayName) || ''));
    contentLines.push('难度：' + ((route && route.name) || ''));
    contentLines.push('');
    if (doors.length) {
      doors.forEach(d => {
        contentLines.push('侧门入口「' + d.door + '」：' + (d.files || []).length + ' 张路线图');
      });
    } else if (rootImages.length) {
      contentLines.push('本难度包含整图路线 ' + rootImages.length + ' 张');
    } else {
      contentLines.push('该形状暂无图片素材，仅有编号信息');
    }
    contentLines.push('');
    contentLines.push('提示：图片为本地原型数据，正式发布前请接入云存储/CDN（详见 data/localMapIndex.js）');

    // 图片指向：分包相对路径（assetBase）或原型绝对路径，后续可切换云存储 URL
    let images = shapeImages;
    if (!images.length && rootImages.length) {
      images = rootImages;
    }

    this.setData({
      strategy: {
        title: (map ? map.displayName : '') + ' · ' + (hasShape ? (shapeId + ' 型路线') : '完整路线图'),
        mapName: (map && map.displayName) || '',
        difficultyTag: (route && route.name) || '',
        difficultyTagClass: TAG_CLASS[routeId] || 'tag-normal',
        author: '宝藏房攻略组',
        summary: doors.length
          ? (doors.map(d => d.door).join(' / ')) + ' 共 ' + doors.length + ' 个入口'
          : '进入查看全图路线',
        content: contentLines.join('\n'),
        coverImage: (map && map.coverImage) || '/images/placeholder/cover.png',
        images: images
      },
      strategyId: mapId + '/' + routeId + '/' + shapeId,
      loading: false
    });
  },

  onShareAppMessage() {
    const s = this.data.strategy;
    if (s) {
      const parts = this.data.strategyId.split('/');
      return {
        title: s.title + " - 加页手记攻略",
        desc: "加页手记·厄运之女路线图",
        path: "/pkg-hard/pages/detail/detail?mapId=" + parts[0] +
              "&routeId=" + parts[1] +
              "&shapeId=" + encodeURIComponent(parts[2])
      };
    }
    return {
      title: "第五人格·加页手记攻略",
      path: "/pages/index/index"
    };
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({ current: this.data.strategy.images[idx], urls: this.data.strategy.images });
  }
});
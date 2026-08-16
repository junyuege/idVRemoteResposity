const api = require('../../data/api.js');

const DIFF_RANK = { newbie: 0, easy: 1, normal: 2, hard: 3, special: 4 };

function formatRouteLabel(name) {
  if (!name) return '';
  if (name.indexOf('速刷') > -1) return '困难·速刷';
  if (name.indexOf('全棺') > -1) return '困难·全棺';
  if (name.indexOf('新版') > -1) return '新版';
  return name.split('·')[0].trim();
}

function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

Page({
  data: {
    loading: true,
    error: '',
    mapId: '',
    mapName: '',
    authors: [],
    authorId: '',
    authorName: '',
    routes: [],
    routeId: '',
    routeName: '',
    shapes: [],
    selectedShape: null,
    doors: [],
    showDoorSheet: false,
    previewIcon: '',
    showIconPreview: false
  },

  onLoad(options) {
    this._lastOptions = options || {};
    this.loadExplorer(this._lastOptions);
  },

  loadExplorer(options) {
    try {
      const maps = api.getMaps();
      const mapId = decode(options.mapId) || ((maps[0] && maps[0].id) || '');
      const map = api.getMapById(mapId);
      if (!map) {
        this.showError('未找到对应的攻略地图');
        return;
      }

      const requestedAuthor = decode(options.author);
      const requestedRouteId = decode(options.routeId || options.mode);
      const allRoutes = api.getRoutesByMapId(mapId);
      const authors = api.getAuthorsByMapId(mapId);
      let selectedAuthor = authors.find(author => author.id === requestedAuthor || author.name === requestedAuthor);
      const requestedRoute = api.getRoute(mapId, requestedRouteId, requestedAuthor);
      if (!selectedAuthor && requestedRoute) {
        selectedAuthor = authors.find(author => author.id === requestedRoute.authorId || author.name === requestedRoute.author);
      }
      if (requestedAuthor && !selectedAuthor) {
          this.showError('未找到该作者的攻略版本');
          return;
      }
      selectedAuthor = selectedAuthor || authors[0];
      let routes = allRoutes.filter(route => selectedAuthor && (route.authorId === selectedAuthor.id || route.author === selectedAuthor.name));
      if (!routes.length) {
        this.showError('该地图暂无可用攻略版本');
        return;
      }

      routes = routes
        .slice()
        .sort((a, b) => (DIFF_RANK[a.difficulty] == null ? 99 : DIFF_RANK[a.difficulty]) - (DIFF_RANK[b.difficulty] == null ? 99 : DIFF_RANK[b.difficulty]))
        .map(route => ({
          id: route.id,
          name: route.name || '',
          label: formatRouteLabel(route.name),
          difficulty: route.difficulty || '',
          authorId: route.authorId || '',
          author: route.author || '其他'
        }));

      const selectedRoute = routes.find(route => route.id === (requestedRoute && requestedRoute.id)) || routes[0];
      const authorName = selectedRoute.author;

      wx.setNavigationBarTitle({ title: (map.displayName || '路线') + ' · 路线查询' });
      this.setData({
        mapId,
        mapName: map.displayName || '',
        authors,
        authorId: selectedAuthor.id,
        authorName,
        routes,
        error: '',
        loading: false
      });
      this.selectRoute(selectedRoute.id, decode(options.shapeId));
    } catch (err) {
      console.error('[explorer] 加载失败', err);
      this.showError('数据加载失败，请稍后重试');
    }
  },

  selectRoute(routeId, initialShapeId) {
    const route = api.getRoute(this.data.mapId, routeId);
    if (!route) {
      this.showError('未找到对应的攻略版本');
      return;
    }

    const shapes = (api.getShapes(this.data.mapId, routeId) || []).map((shape, index) => {
      const detail = api.getShapeDetails(this.data.mapId, routeId, shape);
      const doors = detail && Array.isArray(detail.doors) ? detail.doors : [];
      const rootFiles = detail && Array.isArray(detail.rootFiles) ? detail.rootFiles : [];
      const imageCount = doors.reduce((total, door) => total + ((door.files && door.files.length) || 0), 0) + rootFiles.length;
      return {
        id: String(index),
        shapeId: shape,
        shape,
        title: doors.length ? doors.map(door => door.door).filter(Boolean).join(' / ') : '路线图',
        desc: doors.length ? doors.length + ' 个入口 · ' + imageCount + ' 张图' : imageCount + ' 张路线图'
      };
    });

    const rootFiles = api.getRootImages(this.data.mapId, routeId) || [];
    if (!shapes.length && rootFiles.length) {
      shapes.push({
        id: 'root',
        shapeId: '__root__',
        shape: '整图',
        title: '完整路线图',
        desc: rootFiles.length + ' 张 · 点击直接查看'
      });
    }

    this.setData({
      routeId,
      routeName: route.name || '',
      authorName: route.author || this.data.authorName,
      shapes,
      selectedShape: null,
      doors: [],
      showDoorSheet: false,
      error: ''
    });

    if (initialShapeId) {
      const shapeIndex = shapes.findIndex(item => item.shapeId === initialShapeId);
      if (shapeIndex >= 0) this.openShape(shapes[shapeIndex]);
    }
  },

  onRouteChange(e) {
    const routeId = e.currentTarget.dataset.routeid;
    if (!routeId || routeId === this.data.routeId) return;
    this.selectRoute(routeId, '');
  },

  onAuthorChange(e) {
    const authorId = e.currentTarget.dataset.authorid;
    if (!authorId || authorId === this.data.authorId) return;
    this._lastOptions = { mapId: this.data.mapId, author: authorId };
    this.setData({ loading: true, error: '' });
    this.loadExplorer(this._lastOptions);
  },

  onShapeTap(e) {
    const item = this.data.shapes[e.currentTarget.dataset.index];
    if (item) this.openShape(item);
  },

  openShape(item) {
    if (item.shapeId === '__root__') {
      this.goToDetail(item.shapeId, '');
      return;
    }

    const detail = api.getShapeDetails(this.data.mapId, this.data.routeId, item.shapeId);
    if (!detail) {
      wx.showToast({ title: '该形状暂无入口数据', icon: 'none' });
      return;
    }

    const route = api.getRoute(this.data.mapId, this.data.routeId);
    const doors = (detail.doors || []).map(door => ({
      door: door.door,
      file: '',
      icon: '',
      mark: '门',
      desc: ((door.files && door.files.length) || 0) + ' 张路线图'
    }));
    if ((detail.rootFiles || []).length) {
      if (route && route.entryMode === 'fileIcons') {
        detail.rootFiles.forEach(file => {
          doors.push({
            door: file,
            file: file,
            icon: api.getShapeIconUrl(this.data.mapId, this.data.routeId, item.shapeId, file),
            mark: '',
            desc: '查看对应路线图'
          });
        });
      } else {
        doors.push({ door: '散图', file: '', icon: '', mark: '图', desc: detail.rootFiles.length + ' 张散图' });
      }
    }

    if (!doors.length) {
      this.goToDetail(item.shapeId, '');
      return;
    }
    if (doors.length === 1) {
      this.goToDetail(item.shapeId, doors[0].door, doors[0].file);
      return;
    }

    const hasIcon = doors.some(door => !!door.icon);
    this.setData({ selectedShape: item, doors, hasIcon, showDoorSheet: true });
  },

  onDoorTap(e) {
    const door = this.data.doors[e.currentTarget.dataset.index];
    if (!door || !this.data.selectedShape) return;
    this.goToDetail(this.data.selectedShape.shapeId, door.door, door.file);
  },

  goToDetail(shapeId, door, file) {
    const doorParam = door ? '&door=' + encodeURIComponent(door) : '';
    const fileParam = file ? '&file=' + encodeURIComponent(file) : '';
    wx.navigateTo({
      url: '/pages/detail/detail?mapId=' + encodeURIComponent(this.data.mapId) +
        '&routeId=' + encodeURIComponent(this.data.routeId) +
        '&shapeId=' + encodeURIComponent(shapeId) + doorParam + fileParam
    });
  },

  closeDoorSheet() {
    this.setData({ showDoorSheet: false, selectedShape: null, doors: [] });
  },

  preventClose() {},

  onIconLongPress(e) {
    const icon = e.currentTarget.dataset.icon;
    if (!icon) return;
    this.setData({ previewIcon: icon, showIconPreview: true });
  },

  closeIconPreview() {
    this.setData({ showIconPreview: false, previewIcon: '' });
  },

  preventPreviewClose() {},

  showError(message) {
    this.setData({ loading: false, error: message, shapes: [], showDoorSheet: false });
    wx.showToast({ title: message, icon: 'none' });
  },

  onRetry() {
    this.setData({ loading: true, error: '' });
    this.loadExplorer(this._lastOptions || {});
  },

  onShareAppMessage() {
    return {
      title: this.data.mapName + ' · ' + this.data.routeName,
      path: '/pages/explorer/explorer?mapId=' + encodeURIComponent(this.data.mapId) +
        '&routeId=' + encodeURIComponent(this.data.routeId) +
        '&author=' + encodeURIComponent(this.data.authorId)
    };
  }
});

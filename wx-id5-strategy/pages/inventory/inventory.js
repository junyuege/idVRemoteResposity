const api = require('../../data/api.js');

// 难度 -> 样式类映射（复用既有 wxss 类名，不新增样式）
const TAG_CLASS = {
  hard: 'tag-hard',
  normal: 'tag-normal',
  easy: 'tag-easy',
  newbie: 'tag-nightmare'
};

Page({
  data: { items: [], keyword: '' },

  onLoad() { this.loadItems(); },

  // 图鉴条目 = 地图 × 难度下的每个形状（侧门入口），数据全部来自 SSOT 索引
loadItems() {
    // 图鉴内容暂未开放：保持空白
    this.setData({ allItems: [], items: [] });
  },

  onSearch(e) {
    const kw = (e.detail.value || '').trim().toLowerCase();
    this.setData({ keyword: kw });
  },

  clearSearch() {
    this.setData({ keyword: '' });
  },

  onItemTap(e) {
    const item = this.data.items[e.currentTarget.dataset.index];
    if (!item) return;
    // 跳转对应难度的详情分包页
    wx.navigateTo({
      url: '/pkg-' + item.routeId + '/pages/detail/detail?mapId=' + item.mapId +
           '&routeId=' + item.routeId + '&shapeId=' + encodeURIComponent(item.shapeId)
    });
  }
});
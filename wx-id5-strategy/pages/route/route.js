function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

Page({
  onLoad(options) {
    const mapId = decode(options.mapId);
    const routeId = decode(options.routeId || options.mode);
    wx.redirectTo({
      url: '/pages/explorer/explorer?mapId=' + encodeURIComponent(mapId) +
        '&routeId=' + encodeURIComponent(routeId)
    });
  }
});

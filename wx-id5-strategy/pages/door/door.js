function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

Page({
  onLoad(options) {
    const mapId = decode(options.mapId);
    const routeId = decode(options.routeId);
    const shapeId = decode(options.shapeId);
    wx.redirectTo({
      url: '/pages/explorer/explorer?mapId=' + encodeURIComponent(mapId) +
        '&routeId=' + encodeURIComponent(routeId) +
        '&shapeId=' + encodeURIComponent(shapeId)
    });
  }
});

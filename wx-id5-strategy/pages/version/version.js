function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

Page({
  onLoad(options) {
    const mapId = decode(options.mapId);
    const author = decode(options.author);
    wx.redirectTo({
      url: '/pages/explorer/explorer?mapId=' + encodeURIComponent(mapId) +
        '&author=' + encodeURIComponent(author)
    });
  }
});

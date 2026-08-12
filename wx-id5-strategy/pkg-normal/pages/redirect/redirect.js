// 分包空壳页：保持分包有页面可注册，实际内容在主包 pages/detail
Page({
  onLoad(options) {
    const q = [];
    Object.keys(options || {}).forEach(k => {
      q.push(k + '=' + encodeURIComponent(options[k]));
    });
    wx.redirectTo({ url: '/pages/detail/detail' + (q.length ? '?' + q.join('&') : '') });
  }
});
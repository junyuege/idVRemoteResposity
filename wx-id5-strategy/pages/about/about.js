Page({
  data: {
    version: '1.0.0'
  },

  onLoad() {
    const app = getApp();
    this.setData({ version: (app.globalData && app.globalData.appVersion) || '1.0.0' });
  }
});
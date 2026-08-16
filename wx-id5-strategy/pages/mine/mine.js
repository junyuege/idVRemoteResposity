Page({
  data: {
    version: '1.0.0'
  },

  onLoad() {
    const app = getApp();
    this.setData({ version: (app.globalData && app.globalData.appVersion) || '1.0.0' });
  },

  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  // 隐藏管理入口：长按“我的”页面版本号进入。
  openAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goToTutorial() {
    wx.navigateTo({ url: '/pages/tutorial/tutorial' });
  },

  onShareAppMessage() {
    return {
      title: '第五人格·加页手记攻略查询',
      desc: '地图路线、异象道具辞章图鉴一网打尽',
      path: '/pages/index/index'
    };
  }
});
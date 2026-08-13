// 云开发环境 ID：微信开发者工具 → 云开发控制台 → 设置 → 环境 ID
// 未配置（保持空字符串）时反馈页自动降级为本地暂存，不阻塞其他功能
const CLOUD_ENV = 'cloud1-d0gmgc29t00d235d8';

App({
  globalData: {
    appVersion: '1.0.0',
    cloudReady: false
  },
  onLaunch() {
    if (CLOUD_ENV && wx.cloud && wx.cloud.init) {
      try {
        wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
        this.globalData.cloudReady = true;
      } catch (err) {
        console.error('[app] 云开发初始化失败，将使用本地素材与反馈草稿', err);
      }
    } else if (CLOUD_ENV) {
      console.warn('[app] 当前环境不支持云开发，反馈功能将使用本地草稿');
    }
  }
});

// 云开发配置统一从 config/cloud.js 读取，避免与 tools/gen-cloud-assets.js 的 fileID 前缀漂移。
// 未配置（envId 为空字符串）时反馈页自动降级为本地暂存，不阻塞其他功能。
const cloudConfig = require('./config/cloud.js');
const CLOUD_ENV = (cloudConfig && cloudConfig.envId) || '';

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

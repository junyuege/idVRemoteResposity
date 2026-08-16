/**
 * 匿名事件统计客户端封装。
 * 云能力不可用或云函数未部署时静默失败，绝不影响页面主流程。
 */
function track(event, page, payload) {
  try {
    const app = getApp();
    if (!app || !app.globalData || !app.globalData.cloudReady) return;
    if (!wx.cloud || !wx.cloud.callFunction) return;
    wx.cloud.callFunction({
      name: 'addAnalytics',
      data: {
        event: event,
        page: page || '',
        payload: payload || null
      }
    }).catch(err => {
      console.warn('[analytics] 上报失败', err && err.errMsg || err);
    });
  } catch (err) {}
}

module.exports = { track };

/**
 * 云函数：匿名事件统计
 * 客户端调用：wx.cloud.callFunction({ name: 'addAnalytics', data: { event, page, payload } })
 * 返回：{ code, data, message }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const eventName = String(event && event.event || '').trim();
    if (!eventName) {
      return { code: -1, data: null, message: '事件名不能为空' };
    }
    const { OPENID } = cloud.getWXContext();
    await db.collection('analytics').add({
      data: {
        event: eventName.slice(0, 50),
        page: String(event && event.page || '').slice(0, 100),
        payload: event && event.payload ? event.payload : null,
        openid: OPENID,
        createTime: db.serverDate()
      }
    });
    return { code: 0, data: 'ok', message: 'success' };
  } catch (err) {
    console.error(err);
    return { code: -1, data: null, message: err.message || '记录失败' };
  }
};

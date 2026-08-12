/**
 * 云函数：提交用户反馈
 * 客户端调用：wx.cloud.callFunction({ name: 'addFeedback', data: { content, images } })
 * 返回：{ code, data, message }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const rawContent = event && event.content;
    if (!rawContent || !String(rawContent).trim()) {
      return { code: -1, data: null, message: '反馈内容不能为空' };
    }
    const { OPENID } = cloud.getWXContext();
    const res = await db.collection('feedback').add({
      data: {
        content: String(rawContent).trim().slice(0, 500),
        images: (event.images || []).slice(0, 8).map(String),
        openid: OPENID,
        createTime: db.serverDate()
      }
    });
    return { code: 0, data: res._id, message: 'success' };
  } catch (err) {
    console.error(err);
    return { code: -1, data: null, message: err.message || '提交失败' };
  }
};
/**
 * 管理员云函数
 * action:
 *   whoami            -> 返回当前 openid 与是否管理员
 *   listFeedback      -> 最近 50 条反馈
 *   updateFeedback    -> 更新反馈状态 pending/processing/resolved
 *   analyticsSummary  -> 最近 30 天按事件聚合
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const $ = db.command.aggregate;

// 部署后先调用 whoami 获取自己的 openid，再填入下方数组并重新部署。
const ADMIN_OPENIDS = ['oKq0W7dWANU1cIADEwGBuhZE_Rwl'];

function isAdmin(openid) {
  return ADMIN_OPENIDS.indexOf(openid) >= 0;
}

exports.main = async (event) => {
  const action = String(event && event.action || '');
  const { OPENID } = cloud.getWXContext();

  try {
    if (action === 'whoami') {
      const admin = isAdmin(OPENID);
      return {
        code: 0,
        data: {
          openid: OPENID || '',
          isAdmin: admin,
          adminCount: ADMIN_OPENIDS.length,
          matched: ADMIN_OPENIDS.indexOf(OPENID) >= 0
        },
        message: 'success'
      };
    }
    if (!isAdmin(OPENID)) {
      return { code: 403, data: null, message: '无管理员权限' };
    }
    if (action === 'listFeedback') {
      const res = await db.collection('feedback').orderBy('createTime', 'desc').limit(50).get();
      return { code: 0, data: res.data || [], message: 'success' };
    }
    if (action === 'updateFeedback') {
      const id = event.id;
      const status = event.status;
      if (!id || ['pending', 'processing', 'resolved'].indexOf(status) < 0) {
        return { code: -1, data: null, message: '参数错误' };
      }
      await db.collection('feedback').doc(id).update({
        data: { status: status, updateTime: db.serverDate() }
      });
      return { code: 0, data: null, message: 'success' };
    }
    if (action === 'analyticsSummary') {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const res = await db.collection('analytics').aggregate()
        .match({ createTime: db.command.gte(since) })
        .group({ _id: '$event', count: $.sum(1) })
        .end();
      return { code: 0, data: res.list || [], message: 'success' };
    }
    return { code: -1, data: null, message: '未知 action' };
  } catch (err) {
    console.error(err);
    return { code: -1, data: null, message: err.message || '请求失败' };
  }
};

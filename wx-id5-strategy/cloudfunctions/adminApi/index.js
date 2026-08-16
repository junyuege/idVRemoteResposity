/**
 * 管理员云函数
 * 管理员身份保存在 admin_users 集合，首次通过绑定码绑定当前微信 openid。
 *
 * action:
 *   whoami            -> 返回当前 openid 与是否管理员
 *   bindAdmin         -> 使用绑定码把当前 openid 写入 admin_users
 *   listFeedback      -> 最近 50 条反馈
 *   updateFeedback    -> 更新反馈状态 pending/processing/resolved
 *   analyticsSummary  -> 最近 30 天按事件聚合
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const $ = db.command.aggregate;

// 仅用于首次绑定。绑定成功后即由 admin_users 集合控制，不再依赖这里的 openid 文本。
const ADMIN_BIND_CODE = 'ID5-2026-ADMIN-8F3A';

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admin_users').where({
    openid: openid,
    enabled: true
  }).count();
  return res.total > 0;
}

exports.main = async (event) => {
  const action = String(event && event.action || '');
  const { OPENID } = cloud.getWXContext();

  try {
    if (action === 'whoami') {
      const admin = await isAdmin(OPENID);
      return {
        code: 0,
        data: {
          openid: OPENID || '',
          isAdmin: admin,
          adminCount: 1,
          matched: admin
        },
        message: 'success'
      };
    }

    if (action === 'bindAdmin') {
      const bindCode = String(event && event.bindCode || '').trim();
      if (bindCode !== ADMIN_BIND_CODE) {
        return { code: 401, data: null, message: '绑定码错误' };
      }
      if (!OPENID) {
        return { code: -1, data: null, message: '无法获取 openid' };
      }
      const existed = await db.collection('admin_users').where({ openid: OPENID }).count();
      if (existed.total > 0) {
        const docs = await db.collection('admin_users').where({ openid: OPENID }).limit(1).get();
        await db.collection('admin_users').doc(docs.data[0]._id).update({ data: { enabled: true, updateTime: db.serverDate() } });
      } else {
        await db.collection('admin_users').add({
          data: { openid: OPENID, enabled: true, createTime: db.serverDate(), updateTime: db.serverDate() }
        });
      }
      return { code: 0, data: { openid: OPENID, isAdmin: true }, message: 'success' };
    }

    if (!(await isAdmin(OPENID))) {
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

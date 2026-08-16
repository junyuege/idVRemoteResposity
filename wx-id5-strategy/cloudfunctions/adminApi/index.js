/**
 * 管理员云函数
 * 管理员身份保存在 admin_users 集合，首次通过绑定码绑定当前微信 openid。
 *
 * action:
 *   whoami            -> 返回当前 openid 与是否管理员
 *   bindAdmin         -> 使用绑定码把当前 openid 写入 admin_users
 *   listFeedback      -> 分页返回反馈
 *   updateFeedback    -> 更新反馈状态，并记录处理人与处理时间
 *   analyticsSummary  -> 事件汇总、每日趋势、Top 路线、Top 失败图片
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 仅用于首次绑定。绑定成功后即由 admin_users 集合控制。
const ADMIN_BIND_CODE = 'ID5-2026-ADMIN-8F3A';

async function isAdmin(openid) {
  if (!openid) return false;
  const res = await db.collection('admin_users').where({
    openid: openid,
    enabled: true
  }).count();
  return res.total > 0;
}

function pad(n) { return String(n).padStart(2, '0'); }
function dayKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function buildAnalyticsSummary(rows) {
  const totals = {};
  const dailyMap = {};
  const topRoutesMap = {};
  const topFailedMap = {};

  (rows || []).forEach(row => {
    const eventName = row.event || 'other';
    totals[eventName] = (totals[eventName] || 0) + 1;

    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    if (payload.routeId) {
      topRoutesMap[payload.routeId] = (topRoutesMap[payload.routeId] || 0) + 1;
    }
    if (eventName === 'image_failed' && payload.src) {
      const src = String(payload.src).split('/').pop().slice(0, 80);
      topFailedMap[src] = (topFailedMap[src] || 0) + 1;
    }

    const created = row.createTime ? new Date(row.createTime) : null;
    if (created && !isNaN(created.getTime())) {
      const key = dayKey(created);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    }
  });

  const dailyTrend = [];
  const today = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    dailyTrend.push({ day: key, count: dailyMap[key] || 0 });
  }

  return {
    totals: Object.keys(totals).map(event => ({ event: event, count: totals[event] })),
    dailyTrend: dailyTrend,
    topRoutes: Object.keys(topRoutesMap).map(routeId => ({ routeId: routeId, count: topRoutesMap[routeId] })).sort((a, b) => b.count - a.count).slice(0, 10),
    topFailedImages: Object.keys(topFailedMap).map(src => ({ src: src, count: topFailedMap[src] })).sort((a, b) => b.count - a.count).slice(0, 10)
  };
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
      const page = Math.max(1, parseInt(event && event.page, 10) || 1);
      const pageSize = Math.min(50, Math.max(10, parseInt(event && event.pageSize, 10) || 20));
      const res = await db.collection('feedback')
        .orderBy('createTime', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();
      const list = res.data || [];
      return {
        code: 0,
        data: {
          list: list,
          page: page,
          pageSize: pageSize,
          hasMore: list.length === pageSize
        },
        message: 'success'
      };
    }

    if (action === 'updateFeedback') {
      const id = event.id;
      const status = event.status;
      if (!id || ['pending', 'processing', 'resolved'].indexOf(status) < 0) {
        return { code: -1, data: null, message: '参数错误' };
      }
      await db.collection('feedback').doc(id).update({
        data: {
          status: status,
          updateTime: db.serverDate(),
          handlerOpenid: OPENID
        }
      });
      return { code: 0, data: null, message: 'success' };
    }

    if (action === 'analyticsSummary') {
      const res = await db.collection('analytics').orderBy('createTime', 'desc').limit(300).get();
      return { code: 0, data: buildAnalyticsSummary(res.data || []), message: 'success' };
    }

    return { code: -1, data: null, message: '未知 action' };
  } catch (err) {
    console.error(err);
    return { code: -1, data: null, message: err.message || '请求失败' };
  }
};

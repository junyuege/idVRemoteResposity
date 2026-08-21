// 公告读取：announcements 集合单活跃公告，带本地缓存、已读/关闭记忆与静默降级。
// 云不可用或集合为空时返回 null，页面侧不渲染任何公告 UI，不影响主流程。
const CACHE_KEY = 'id5_announcement_cache_v1';
const STATE_KEY = 'id5_announcement_state_v1';
const CACHE_TTL = 60 * 60 * 1000; // 缓存 1 小时

function isCloudReady() {
  try {
    const app = getApp();
    return Boolean(app && app.globalData && app.globalData.cloudReady && wx.cloud && wx.cloud.callFunction);
  } catch (e) {
    return false;
  }
}

function getState() {
  try { return wx.getStorageSync(STATE_KEY) || {}; } catch (e) { return {}; }
}

function saveState(state) {
  try { wx.setStorageSync(STATE_KEY, state); } catch (e) {}
}

function itemVersion(item) {
  if (!item) return 0;
  // 与 adminApi 写入字段对齐：updateTime / createTime（serverDate）
  const raw = item.updateTime || item.createdAt || 0;
  const t = raw ? new Date(raw).getTime() : 0;
  return isFinite(t) ? t : 0;
}

// 已读：弹窗只展示一次；公告内容更新后（updatedAt 变新）重新视为未读
function isRead(item) {
  const state = getState()[item && item._id] || {};
  const readAt = state.readAt || 0;
  return readAt > 0 && readAt >= itemVersion(item);
}

function markRead(id) {
  if (!id) return;
  const state = getState();
  state[id] = Object.assign({}, state[id], { readAt: Date.now() });
  saveState(state);
}

// 关闭：横幅不再显示；同样随内容更新重置
function isDismissed(item) {
  const state = getState()[item && item._id] || {};
  const dismissedAt = state.dismissedAt || 0;
  return dismissedAt > 0 && dismissedAt >= itemVersion(item);
}

function dismiss(id) {
  if (!id) return;
  const state = getState();
  state[id] = Object.assign({}, state[id], { dismissedAt: Date.now(), readAt: Date.now() });
  saveState(state);
}

function getCached() {
  try {
    const hit = wx.getStorageSync(CACHE_KEY);
    if (hit && hit.item && hit.item._id) return hit.item;
  } catch (e) {}
  return null;
}

function setCached(item) {
  try { wx.setStorageSync(CACHE_KEY, { item: item, ts: Date.now() }); } catch (e) {}
}

/**
 * 获取当前上线中的公告（单条）。
 * 读取走 adminApi.getAnnouncement 公开 action：无需集合读权限，服务端绕过权限模型。
 * 云不可用 -> 返回缓存兜底；查询失败 -> 返回缓存；无公告 -> null。绝不 reject。
 */
function fetchActive() {
  return new Promise((resolve) => {
    const cached = getCached();
    if (!isCloudReady()) { resolve(cached); return; }
    try {
      wx.cloud.callFunction({
        name: 'adminApi',
        data: { action: 'getAnnouncement' }
      }).then((res) => {
        const result = (res && res.result) || {};
        const item = (result.code === 0 && result.data && result.data.item) || null;
        if (item) setCached(item);
        resolve(item);
      }).catch(() => resolve(cached));
    } catch (e) {
      resolve(cached);
    }
  });
}

module.exports = { fetchActive, isRead, markRead, isDismissed, dismiss, getCached };

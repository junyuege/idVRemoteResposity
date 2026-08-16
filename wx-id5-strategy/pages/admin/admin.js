const analytics = require('../../utils/analytics.js');

const STATUS_TEXT = { pending: '待处理', processing: '处理中', resolved: '已解决' };
const STATUS_CLASS = { pending: 'tag-hard', processing: 'tag-orange', resolved: 'tag-easy' };

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function callAdmin(action, payload) {
  return wx.cloud.callFunction({
    name: 'adminApi',
    data: Object.assign({ action: action }, payload || {})
  }).then(res => res.result || {});
}

Page({
  data: {
    loading: true,
    error: '',
    openid: '',
    isAdmin: false,
    activeTab: 'feedback',
    feedback: [],
    stats: []
  },

  onLoad() {
    analytics.track('page_view', 'pages/admin/admin');
    this.whoami();
  },

  whoami() {
    if (!wx.cloud || !wx.cloud.callFunction) {
      this.setData({ loading: false, error: '云能力不可用' });
      return;
    }
    callAdmin('whoami').then(result => {
      if (result.code !== 0) {
        this.setData({ loading: false, error: result.message || '身份识别失败' });
        return;
      }
      const isAdmin = result.data && result.data.isAdmin;
      this.setData({
        loading: false,
        openid: result.data.openid || '',
        isAdmin: !!isAdmin
      });
      if (isAdmin) {
        this.loadFeedback();
        this.loadStats();
      }
    }).catch(() => {
      this.setData({ loading: false, error: '云函数 adminApi 可能未部署' });
    });
  },

  loadFeedback() {
    callAdmin('listFeedback').then(result => {
      if (result.code === 0) {
        const feedback = (result.data || []).map(item => ({
          id: item._id,
          content: item.content || '',
          images: (item.images || []).length,
          status: item.status || 'pending',
          statusText: STATUS_TEXT[item.status] || STATUS_TEXT.pending,
          statusClass: STATUS_CLASS[item.status] || STATUS_CLASS.pending,
          time: formatTime(item.createTime)
        }));
        this.setData({ feedback: feedback });
      }
    }).catch(() => {});
  },

  loadStats() {
    callAdmin('analyticsSummary').then(result => {
      if (result.code === 0) {
        const labels = { page_view: '页面访问', image_failed: '图片失败', search_no_result: '无结果搜索' };
        this.setData({
          stats: (result.data || []).map(item => ({
            label: labels[item._id] || item._id,
            count: item.count || 0
          }))
        });
      }
    }).catch(() => {});
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onFeedbackStatusTap(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    callAdmin('updateFeedback', { id: id, status: status }).then(result => {
      if (result.code === 0) this.loadFeedback();
    }).catch(() => {});
  },

  retry() {
    this.setData({ loading: true, error: '' });
    this.whoami();
  }
});

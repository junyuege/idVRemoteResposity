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
    adminCount: 0,
    matched: false,
    bindCode: '',
    binding: false,
    activeTab: 'feedback',
    feedback: [],
    feedbackPage: 1,
    hasMore: false,
    loadingMore: false,
    stats: {
      totals: [],
      dailyTrend: [],
      topRoutes: [],
      topFailedImages: []
    },
    announcements: [],
    annLoading: false,
    annEditing: '',
    annTitle: '',
    annContent: '',
    annSaving: false
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
        isAdmin: !!isAdmin,
        adminCount: result.data.adminCount || 0,
        matched: !!result.data.matched
      });
      if (isAdmin) {
        this.loadFeedback(true);
        this.loadStats();
        this.loadAnnouncements();
      }
    }).catch(err => {
      this.setData({
        loading: false,
        error: '云函数调用失败：' + ((err && (err.errMsg || err.message)) || '未知错误')
      });
    });
  },

  loadFeedback(reset) {
    const page = reset ? 1 : this.data.feedbackPage;
    callAdmin('listFeedback', { page: page, pageSize: 20 }).then(result => {
      if (result.code !== 0) return;
      const payload = result.data || {};
      const mapped = (payload.list || []).map(item => ({
        id: item._id,
        content: item.content || '',
        images: item.images || [],
        imageCount: (item.images || []).length,
        status: item.status || 'pending',
        statusText: STATUS_TEXT[item.status] || STATUS_TEXT.pending,
        statusClass: STATUS_CLASS[item.status] || STATUS_CLASS.pending,
        time: formatTime(item.createTime),
        processedTime: formatTime(item.updateTime)
      }));
      this.setData({
        feedback: reset ? mapped : this.data.feedback.concat(mapped),
        feedbackPage: page,
        hasMore: !!payload.hasMore,
        loadingMore: false
      });
    }).catch(() => {
      this.setData({ loadingMore: false });
    });
  },

  loadMoreFeedback() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true, feedbackPage: this.data.feedbackPage + 1 });
    this.loadFeedback(false);
  },

  previewFeedbackImages(e) {
    const item = this.data.feedback[e.currentTarget.dataset.index];
    if (!item || !item.images || !item.images.length) {
      wx.showToast({ title: '暂无截图', icon: 'none' });
      return;
    }
    if (!wx.cloud || !wx.cloud.getTempFileURL) {
      wx.showToast({ title: '云能力不可用', icon: 'none' });
      return;
    }
    wx.cloud.getTempFileURL({ fileList: item.images }).then(res => {
      const urls = (res.fileList || []).filter(it => it.status === 0 && it.tempFileURL).map(it => it.tempFileURL);
      if (!urls.length) {
        wx.showToast({ title: '截图无法加载', icon: 'none' });
        return;
      }
      wx.previewImage({ current: urls[0], urls: urls });
    }).catch(() => {
      wx.showToast({ title: '截图预览失败', icon: 'none' });
    });
  },

  loadStats() {
    callAdmin('analyticsSummary').then(result => {
      if (result.code !== 0) return;
      const payload = result.data || {};
      const labels = { page_view: '页面访问', image_failed: '图片失败', search_no_result: '无结果搜索' };
      const trend = payload.dailyTrend || [];
      const maxTrend = trend.reduce((max, item) => Math.max(max, item.count || 0), 0);
      this.setData({
        stats: {
          totals: (payload.totals || []).map(item => ({
            label: labels[item.event] || item.event,
            count: item.count || 0
          })),
          dailyTrend: trend.map(item => ({
            day: item.day,
            count: item.count || 0,
            percent: maxTrend ? Math.max(4, Math.round((item.count || 0) * 100 / maxTrend)) : 0
          })),
          topRoutes: payload.topRoutes || [],
          topFailedImages: payload.topFailedImages || []
        }
      });
    }).catch(() => {});
  },

  onBindInput(e) {
    this.setData({ bindCode: e.detail.value || '' });
  },

  bindAdmin() {
    const bindCode = (this.data.bindCode || '').trim();
    if (!bindCode) {
      wx.showToast({ title: '请输入绑定码', icon: 'none' });
      return;
    }
    this.setData({ binding: true });
    callAdmin('bindAdmin', { bindCode: bindCode }).then(result => {
      this.setData({ binding: false });
      if (result.code === 0) {
        wx.showToast({ title: '绑定成功', icon: 'success' });
        this.whoami();
      } else {
        wx.showToast({ title: result.message || '绑定失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ binding: false });
      wx.showToast({ title: '绑定失败', icon: 'none' });
    });
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'announcement' && !this.data.announcements.length) this.loadAnnouncements();
  },

  // ===== 公告管理 =====

  loadAnnouncements() {
    if (this.data.annLoading) return;
    this.setData({ annLoading: true });
    callAdmin('announcementList').then(result => {
      const list = result.code === 0 ? (result.data && result.data.list || []) : [];
      this.setData({
        annLoading: false,
        announcements: list.map(item => ({
          id: item._id,
          title: item.title || '',
          content: item.content || '',
          active: !!item.active,
          time: formatTime(item.createTime)
        }))
      });
    }).catch(() => {
      this.setData({ annLoading: false });
      wx.showToast({ title: '公告加载失败', icon: 'none' });
    });
  },

  onAnnNew() {
    this.setData({ annEditing: '', annTitle: '', annContent: '' });
  },

  onAnnEdit(e) {
    const item = this.data.announcements.find(a => a.id === e.currentTarget.dataset.id);
    if (!item) return;
    this.setData({ annEditing: item.id, annTitle: item.title, annContent: item.content });
  },

  onAnnCancel() {
    this.setData({ annEditing: '', annTitle: '', annContent: '' });
  },

  onAnnTitleInput(e) {
    this.setData({ annTitle: e.detail.value || '' });
  },

  onAnnContentInput(e) {
    this.setData({ annContent: e.detail.value || '' });
  },

  saveAnnouncement() {
    const title = (this.data.annTitle || '').trim();
    const content = (this.data.annContent || '').trim();
    if (!title || !content) {
      wx.showToast({ title: '标题和内容不能为空', icon: 'none' });
      return;
    }
    this.setData({ annSaving: true });
    const action = this.data.annEditing ? 'announcementUpdate' : 'announcementCreate';
    const payload = { title: title, content: content };
    if (this.data.annEditing) payload.id = this.data.annEditing;
    callAdmin(action, payload).then(result => {
      this.setData({ annSaving: false });
      if (result.code === 0) {
        wx.showToast({ title: this.data.annEditing ? '已保存' : '已发布', icon: 'success' });
        this.onAnnCancel();
        this.loadAnnouncements();
      } else {
        wx.showToast({ title: result.message || '保存失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ annSaving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  toggleAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    const active = e.currentTarget.dataset.active === '1';
    callAdmin('announcementToggle', { id: id, active: !active }).then(result => {
      if (result.code === 0) this.loadAnnouncements();
      else wx.showToast({ title: result.message || '操作失败', icon: 'none' });
    }).catch(() => {});
  },

  deleteAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除公告',
      content: '删除后不可恢复，确认删除？',
      confirmColor: '#d96a5b',
      success: res => {
        if (!res.confirm) return;
        callAdmin('announcementDelete', { id: id }).then(result => {
          if (result.code === 0) this.loadAnnouncements();
          else wx.showToast({ title: result.message || '删除失败', icon: 'none' });
        }).catch(() => {});
      }
    });
  },

  onFeedbackStatusTap(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    callAdmin('updateFeedback', { id: id, status: status }).then(result => {
      if (result.code === 0) this.loadFeedback(true);
    }).catch(() => {});
  },

  retry() {
    this.setData({ loading: true, error: '' });
    this.whoami();
  }
});

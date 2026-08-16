const analytics = require('../../utils/analytics.js');

const TUTORIAL_IMAGE = '/images/tutorial/xiaochao-jiaoxue.png';

Page({
  data: {
    image: TUTORIAL_IMAGE,
    loading: true,
    failed: false
  },

  onLoad() {
    this.setData({ loading: false, failed: false });
    analytics.track('page_view', 'pages/tutorial/tutorial');
  },

  onImageError() {
    console.warn('[tutorial] 教学图加载失败');
    this.setData({ loading: false, failed: true });
  },

  onRetry() {
    this.setData({ loading: true, failed: false });
    setTimeout(() => this.setData({ loading: false }), 50);
  },

  // 点击图片全屏预览，支持双指缩放
  onPreview() {
    if (this.data.failed) return;
    wx.previewImage({ current: TUTORIAL_IMAGE, urls: [TUTORIAL_IMAGE] });
  },

  onShareAppMessage() {
    return {
      title: '加页手记小抄看法教学',
      path: '/pages/tutorial/tutorial'
    };
  },

  onShareTimeline() {
    return {
      title: '加页手记小抄看法教学'
    };
  }
});

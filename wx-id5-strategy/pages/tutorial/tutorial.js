const TUTORIAL_IMAGE = '/images/tutorial/xiaochao-jiaoxue.png';

Page({
  data: {
    image: TUTORIAL_IMAGE,
    loading: true
  },

  onLoad() {
    this.setData({ loading: false });
  },

  // 点击图片全屏预览，支持双指缩放
  onPreview() {
    wx.previewImage({ current: TUTORIAL_IMAGE, urls: [TUTORIAL_IMAGE] });
  },

  onShareAppMessage() {
    return {
      title: '加页手记小抄看法教学',
      path: '/pages/tutorial/tutorial'
    };
  }
});

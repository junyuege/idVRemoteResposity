Page({
  data: { content: '', contentLength: 0, images: [] },
  onContentInput(e) { this.setData({ content: e.detail.value, contentLength: e.detail.value.length }); },
  chooseImage() {
    const remain = 8 - this.data.images.length;
    wx.chooseImage({ count: remain, sizeType: ['compressed'], sourceType: ['album','camera'], success: (res) => {
      this.setData({ images: [...this.data.images, ...res.tempFilePaths] });
    }});
  },
  submitFeedback() {
    if (!this.data.content.trim()) { wx.showToast({ title: '请输入反馈内容', icon: 'none' }); return; }
    wx.showToast({ title: '提交成功，感谢反馈！', icon: 'success' });
    this.setData({ content: '', contentLength: 0, images: [] });
  }
});
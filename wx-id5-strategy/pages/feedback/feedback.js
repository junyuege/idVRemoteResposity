const DRAFT_KEY = 'feedback_draft';

Page({
  data: { content: '', contentLength: 0, images: [] },
  onLoad() {
    const draft = wx.getStorageSync(DRAFT_KEY);
    if (draft && draft.content && !this.data.content) {
      this.setData({
        content: draft.content,
        contentLength: draft.content.length,
        images: draft.images || []
      });
      wx.showToast({ title: '已恢复未提交的草稿', icon: 'none' });
    }
  },
  onContentInput(e) { this.setData({ content: e.detail.value, contentLength: e.detail.value.length }); },
  chooseImage() {
    const remain = 8 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseImage({ count: remain, sizeType: ['compressed'], sourceType: ['album','camera'], success: (res) => {
      this.setData({ images: [...this.data.images, ...res.tempFilePaths] });
    }});
  },
  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(idx, 1);
    this.setData({ images });
  },
  submitFeedback() {
    if (!this.data.content.trim()) { wx.showToast({ title: '请输入反馈内容', icon: 'none' }); return; }
    const app = getApp();
    if (!app.globalData.cloudReady) { this.saveDraft(); return; }
    wx.showLoading({ title: '提交中...' });
    const uploads = this.data.images.map((p, i) =>
      wx.cloud.uploadFile({
        cloudPath: 'feedback/' + Date.now() + '_' + i + p.slice(p.lastIndexOf('.')),
        filePath: p
      }).then(r => r.fileID).catch(() => '')
    );
    Promise.all(uploads).then((fileIDs) => {
      return wx.cloud.callFunction({
        name: 'addFeedback',
        data: { content: this.data.content.trim(), images: fileIDs.filter(Boolean) }
      });
    }).then((res) => {
      wx.hideLoading();
      const r = res.result || {};
      if (r.code === 0) {
        wx.removeStorageSync(DRAFT_KEY);
        this.setData({ content: '', contentLength: 0, images: [] });
        wx.showToast({ title: '提交成功，感谢反馈！', icon: 'success' });
      } else {
        this.saveDraft();
        wx.showToast({ title: '提交失败，已暂存草稿', icon: 'none' });
      }
    }).catch(() => {
      wx.hideLoading();
      this.saveDraft();
      wx.showToast({ title: '网络异常，已暂存草稿', icon: 'none' });
    });
  },
  saveDraft() {
    wx.setStorageSync(DRAFT_KEY, {
      content: this.data.content.trim(),
      images: this.data.images,
      ts: Date.now()
    });
  }
});
const DRAFT_KEY = 'feedback_draft';
const DRAFT_IMAGE_DIR = 'feedback_draft_images';

function getFileSystem() {
  return wx.getFileSystemManager ? wx.getFileSystemManager() : null;
}

function getDraftImageDir() {
  return (wx.env && wx.env.USER_DATA_PATH) ? wx.env.USER_DATA_PATH + '/' + DRAFT_IMAGE_DIR : '';
}

function isDraftImagePath(path) {
  const dir = getDraftImageDir();
  return !!(dir && String(path || '').indexOf(dir) === 0);
}

Page({
  data: { content: '', contentLength: 0, images: [], submitting: false },
  onLoad() {
    const draft = wx.getStorageSync(DRAFT_KEY);
    if (draft && (draft.content || (draft.images && draft.images.length)) && !this.data.content && !this.data.images.length) {
      // 旧草稿可能保存的是临时路径；新草稿保存在 USER_DATA_PATH。
      // 只丢弃已确认不存在的持久化文件，临时路径仍保留，等待用户自行处理。
      const fs = getFileSystem();
      const images = (draft.images || []).filter(path => {
        if (!isDraftImagePath(path) || !fs || !fs.accessSync) return true;
        try { fs.accessSync(path); return true; } catch (e) { return false; }
      });
      this.setData({
        content: draft.content,
        contentLength: draft.content.length,
        images: images
      });
      wx.showToast({ title: '已恢复未提交的草稿', icon: 'none' });
    }
  },
  ensureDraftImageDir() {
    const fs = getFileSystem();
    const dir = getDraftImageDir();
    if (!fs || !dir) return false;
    try { fs.accessSync(dir); } catch (e) {
      try { fs.mkdirSync(dir); } catch (err) {
        console.warn('[feedback] 创建草稿目录失败', err);
        return false;
      }
    }
    return true;
  },
  // 把 wx.chooseImage 的临时文件复制到 USER_DATA_PATH，避免重启后临时文件被清理。
  persistImages(tempPaths) {
    const fs = getFileSystem();
    if (!fs || !fs.copyFileSync || !this.ensureDraftImageDir()) return (tempPaths || []).slice();
    const stamp = Date.now();
    return (tempPaths || []).map((path, index) => {
      const extMatch = String(path).match(/\.[a-zA-Z0-9]+$/);
      const extension = extMatch ? extMatch[0].toLowerCase() : '.jpg';
      const dest = getDraftImageDir() + '/' + stamp + '_' + index + extension;
      try {
        fs.copyFileSync(path, dest);
        return dest;
      } catch (err) {
        console.warn('[feedback] 草稿图片持久化失败，保留临时路径', err);
        return path;
      }
    });
  },
  removePersistedImages(paths) {
    const fs = getFileSystem();
    if (!fs || !fs.unlinkSync) return;
    (paths || []).forEach(path => {
      if (isDraftImagePath(path)) {
        try { fs.unlinkSync(path); } catch (e) {}
      }
    });
  },
  onContentInput(e) {
    this.setData({ content: e.detail.value, contentLength: e.detail.value.length });
    this.saveDraft(e.detail.value, this.data.images);
  },
  chooseImage() {
    const remain = 8 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseImage({ count: remain, sizeType: ['compressed'], sourceType: ['album','camera'], success: (res) => {
      const persisted = this.persistImages(res.tempFilePaths || []);
      const images = [...this.data.images, ...persisted];
      this.setData({ images });
      this.saveDraft(this.data.content, images);
    }});
  },
  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    const removed = images.splice(idx, 1);
    this.removePersistedImages(removed);
    this.setData({ images });
    this.saveDraft(this.data.content, images);
  },
  submitFeedback() {
    if (this.data.submitting) return;
    if (!this.data.content.trim()) { wx.showToast({ title: '请输入反馈内容', icon: 'none' }); return; }
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.saveDraft();
      wx.showToast({ title: '服务未连接，已保存草稿', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });
    const uploadBatch = Date.now();
    const uploads = this.data.images.map((p, i) => {
      const extMatch = String(p).match(/\.[a-zA-Z0-9]+$/);
      const extension = extMatch ? extMatch[0].toLowerCase() : '.jpg';
      return wx.cloud.uploadFile({
        cloudPath: 'feedback/' + uploadBatch + '_' + i + extension,
        filePath: p
      }).then(r => r.fileID).catch(() => '');
    });
    Promise.all(uploads).then((fileIDs) => {
      return wx.cloud.callFunction({
        name: 'addFeedback',
        data: { content: this.data.content.trim(), images: fileIDs.filter(Boolean) }
      });
    }).then((res) => {
      wx.hideLoading();
      this.setData({ submitting: false });
      const r = res.result || {};
      if (r.code === 0) {
        this.removePersistedImages(this.data.images);
        wx.removeStorageSync(DRAFT_KEY);
        this.setData({ content: '', contentLength: 0, images: [] });
        wx.showToast({ title: '提交成功，感谢反馈！', icon: 'success' });
      } else {
        this.saveDraft();
        wx.showToast({ title: '提交失败，已暂存草稿', icon: 'none' });
      }
    }).catch(() => {
      wx.hideLoading();
      this.setData({ submitting: false });
      this.saveDraft();
      wx.showToast({ title: '网络异常，已暂存草稿', icon: 'none' });
    });
  },
  saveDraft(content, images) {
    const draftContent = (content || this.data.content || '').trim();
    const draftImages = images || this.data.images || [];
    if (!draftContent && !draftImages.length) return;
    wx.setStorageSync(DRAFT_KEY, {
      content: draftContent,
      images: draftImages,
      ts: Date.now()
    });
  },
  onUnload() {
    if (this.data.content.trim()) this.saveDraft();
  }
});

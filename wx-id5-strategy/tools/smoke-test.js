/**
 * 全功能冒烟测试：模拟微信小程序页面，遍历所有路线、形状、入口与详情页。
 * 运行：node tools/smoke-test.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const storage = {};
const loadedPackages = [];
const navigationCalls = [];
let cloudCalls = 0;
let cloudItems = 0;

global.wx = {
  env: { USER_DATA_PATH: path.join(ROOT, '.tmp', 'feedback-draft') },
  cloud: {
    getTempFileURL({ fileList }) {
      cloudCalls += 1; cloudItems += (fileList || []).length;
      return Promise.resolve({ fileList: (fileList || []).map(fileID => ({ fileID, status: 0, tempFileURL: 'https://mock.local/' + encodeURIComponent(fileID) })) });
    },
    uploadFile() { return Promise.resolve({ fileID: 'cloud://mock/feedback.jpg' }); },
    callFunction() { return Promise.resolve({ result: { code: 0, data: 'mock-id' } }); }
  },
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; },
  setNavigationBarTitle() {},
  loadSubpackage({ name, success }) { loadedPackages.push(name); if (success) success(); },
  showToast() {}, hideLoading() {}, showLoading() {}, stopPullDownRefresh() {},
  chooseImage() {},
  navigateTo(options) { navigationCalls.push({ method: 'navigateTo', url: options.url }); },
  redirectTo(options) { navigationCalls.push({ method: 'redirectTo', url: options.url }); },
  switchTab() {}, previewImage() {},
  getFileSystemManager() {
    return {
      accessSync(p) { fs.accessSync(p); },
      mkdirSync(p) { fs.mkdirSync(p, { recursive: true }); },
      copyFileSync(src, dst) { fs.copyFileSync(src, dst); },
      unlinkSync(p) { fs.unlinkSync(p); }
    };
  }
};
global.getApp = () => ({ globalData: { appVersion: '1.0.0', cloudReady: true } });

function setByPath(target, key, value) {
  const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) { if (cursor[parts[i]] == null) cursor[parts[i]] = {}; cursor = cursor[parts[i]]; }
  cursor[parts[parts.length - 1]] = value;
}

function loadPage(relativePath) {
  let definition = null;
  global.Page = config => { definition = config; };
  const absolutePath = path.join(ROOT, relativePath);
  delete require.cache[require.resolve(absolutePath)];
  require(absolutePath);
  if (!definition) throw new Error('Page not registered: ' + relativePath);
  const page = Object.assign({}, definition);
  page.data = JSON.parse(JSON.stringify(definition.data || {}));
  page.setData = function (patch, callback) {
    Object.keys(patch).forEach(key => setByPath(this.data, key, patch[key]));
    if (callback) callback();
  };
  return page;
}

function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  const api = require('../data/api.js');
  const maps = api.getMaps();
  assert(maps.length > 0, 'maps empty');

  for (let loop = 1; loop <= 2; loop += 1) {
    navigationCalls.length = 0; loadedPackages.length = 0; cloudCalls = 0; cloudItems = 0;
    let routePassed = 0, shapePassed = 0, choicePassed = 0, detailPassed = 0;
    for (const map of maps) {
      const authors = api.getAuthorsByMapId(map.id);
      assert(authors.length >= 2, 'authors missing');
      for (const author of authors) {
        const routes = api.getRoutesByMapId(map.id).filter(r => r.authorId === author.id || r.author === author.name);
        for (const route of routes) {
          const explorer = loadPage('pages/explorer/explorer.js');
          explorer.onLoad({ mapId: map.id, author: encodeURIComponent(author.id), routeId: encodeURIComponent(route.id) });
          assert(explorer.data.routeId === route.id, 'explorer route mismatch: ' + route.id);
          assert(explorer.data.displayShapes.length === explorer.data.shapes.length, 'displayShapes initial mismatch: ' + route.id);
          routePassed += 1;
          for (const shapeItem of explorer.data.shapes) {
            navigationCalls.length = 0;
            explorer.openShape(shapeItem);
            shapePassed += 1;
            if (shapeItem.shapeId === '__root__') {
              const detail = loadPage('pages/detail/detail.js');
              detail.onLoad({ mapId: map.id, routeId: route.id, shapeId: '__root__' });
              await new Promise(resolve => setImmediate(resolve));
              assert(detail.data.strategy && detail.data.strategy.images.length > 0, 'root detail empty: ' + route.id);
              detailPassed += 1;
              continue;
            }
            const detail = api.getShapeDetails(map.id, route.id, shapeItem.shapeId);
            assert(Boolean(detail), 'shape detail missing: ' + route.id + '/' + shapeItem.shapeId);
            const choices = explorer.data.showDoorSheet ? explorer.data.doors.slice() : (detail.doors || []).map(d => ({ door: d.door, file: '' }));
            if (!choices.length && (detail.rootFiles || []).length) choices.push({ door: '__files__', file: detail.rootFiles[0] });
            if (!choices.length) choices.push({ door: '', file: '' });
            for (const choice of choices) {
              choicePassed += 1;
              const detailPage = loadPage('pages/detail/detail.js');
              const opts = { mapId: map.id, routeId: route.id, shapeId: encodeURIComponent(shapeItem.shapeId) };
              if (choice.file) opts.file = encodeURIComponent(choice.file); else if (choice.door) opts.door = encodeURIComponent(choice.door);
              detailPage.onLoad(opts);
              await new Promise(resolve => setImmediate(resolve));
              assert(detailPage.data.strategy && detailPage.data.strategy.images.length > 0, 'detail empty: ' + route.id + '/' + shapeItem.shapeId + '/' + (choice.door || choice.file));
              assert(detailPage.data.strategy.images.every(url => String(url).indexOf('cloud://') !== 0), 'unresolved cloud id: ' + route.id);
              detailPassed += 1;
            }
          }
          explorer.onSearchInput({ detail: { value: explorer.data.shapes[0].shape } });
          assert(explorer.data.displayShapes.length > 0 && explorer.data.displayShapes.length <= explorer.data.shapes.length, 'search filter failed: ' + route.id);
          explorer.clearSearch();
          assert(explorer.data.displayShapes.length === explorer.data.shapes.length, 'search clear failed: ' + route.id);
        }
      }
    }
    const inventory = loadPage('pages/inventory/inventory.js');
    inventory.onLoad();
    const expectedInventory = api.getInventoryData().length + api.getChapterData().length;
    assert(inventory.data.allItems.length === expectedInventory, 'inventory entries mismatch');
    const index = loadPage('pages/index/index.js');
    index.onLoad();
    assert(index.data.recentHistory.length > 0, 'recent history missing');
    index.openHistorySheet();
    assert(index.data.showHistory === true && index.data.recentHistoryVisible.length <= 2, 'history sheet failed');
    navigationCalls.length = 0;
    index.onHistoryTap({ currentTarget: { dataset: { index: 0 } } });
    assert(navigationCalls[0] && navigationCalls[0].url.includes('/pages/detail/detail?'), 'recent navigation failed');
    assert(index.data.showHistory === false, 'history sheet should close after tap');
    console.log('loop', loop, 'OK | routes', routePassed, 'shapes', shapePassed, 'choices', choicePassed, 'details', detailPassed, 'cloudCalls', cloudCalls, 'cloudItems', cloudItems);
  }
  console.log('SMOKE_ALL_OK');
  fs.rmSync(path.join(ROOT, '.tmp'), { recursive: true, force: true });
})().catch(err => {
  console.error('SMOKE_FAILED:', err && err.stack || err);
  process.exit(1);
});

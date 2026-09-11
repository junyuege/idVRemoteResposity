/**
 * 异常注入测试：验证各页面异常兜底分支确实生效。
 *
 * 背景：smoke-test.js 只遍历正常数据链路，不会触发 catch 分支，
 * 因此异常兜底代码存在被后续重构误删的风险。本脚本通过注入故障
 * 主动验证这些分支，防止"注释写着会兜底、实现却漏了 catch"的情况回归。
 *
 * 运行：node tools/fault-injection-test.js
 */
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
// 临时目录放系统 temp：工程目录里的临时文件会被开发者工具扫描/打包，容易引发 ENOENT
const TMP_ROOT = path.join(os.tmpdir(), 'id5-fault');
const storage = {};

global.wx = {
  env: { USER_DATA_PATH: path.join(TMP_ROOT, 'fault-injection') },
  cloud: {
    getTempFileURL: ({ fileList }) => Promise.resolve({
      fileList: (fileList || []).map(fileID => ({ fileID, status: 0, tempFileURL: 'https://mock.local/' + encodeURIComponent(fileID) }))
    }),
    uploadFile: () => Promise.resolve({ fileID: 'cloud://mock/feedback.jpg' }),
    callFunction: () => Promise.resolve({ result: { code: 0, data: 'mock-id' } })
  },
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; },
  setNavigationBarTitle() {},
  loadSubpackage({ success }) { if (success) success(); },
  showToast() {}, showLoading() {}, hideLoading() {}, stopPullDownRefresh() {},
  navigateTo() {}, redirectTo() {}, switchTab() {}, previewImage() {},
  getFileSystemManager: () => ({ accessSync() {}, mkdirSync() {}, copyFileSync() {}, unlinkSync() {} })
};
global.getApp = () => ({ globalData: { appVersion: '1.2.2', cloudReady: true } });

function setByPath(target, key, value) {
  const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cursor[parts[i]] == null) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
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

const RECENT_HISTORY_KEY = 'id5_recent_history_v1';
const RECENT_VIEW_KEY = 'id5_recent_view_v1';

// 详情页用 __root__（整图）路径测试。多数路线是纯形状路线（整图 0 张），
// 直接取 routes[0] 会命中无图路线，必须动态挑一条确实有整图的。
function pickRootRoute(api, mapId, routes) {
  for (const route of routes) {
    if ((api.getRootImageUrls(mapId, route.id) || []).length > 0) return route;
  }
  return null;
}

(async () => {
  const api = require('../data/api.js');
  const maps = api.getMaps();
  assert(maps.length > 0, '地图索引为空，无法测试');
  const mapId = maps[0].id;
  const routes = api.getRoutesByMapId(mapId);
  assert(routes.length > 0, '路线索引为空，无法测试');
  const rootRoute = pickRootRoute(api, mapId, routes);
  assert(rootRoute, '未找到带整图的路线，无法测试详情页');

  let passed = 0;

  // 用例1：详情页分包下载失败 -> 必须落错误态（有提示+可重试），不能永久停在 loading
  {
    const original = api.loadRoutePackage;
    api.loadRoutePackage = () => Promise.reject(new Error('mock 分包下载失败'));
    const detail = loadPage('pages/detail/detail.js');
    detail.onLoad({ mapId, routeId: rootRoute.id, shapeId: '__root__' });
    await new Promise(resolve => setImmediate(resolve));
    assert(detail.data.error !== '', '用例1失败：分包下载失败后未落错误态（会永久停在"正在加载攻略图片..."）');
    assert(detail.data.loading === false, '用例1失败：loading 未关闭');
    console.log('  用例1 通过：详情页分包下载失败 -> 落错误态（有提示且可重试）');
    api.loadRoutePackage = original;
    passed += 1;
  }

  // 用例2：详情页临时链接解析失败 -> 同样必须落错误态
  {
    const original = api.resolveImageUrls;
    api.resolveImageUrls = () => Promise.reject(new Error('mock 临时链接解析失败'));
    const detail = loadPage('pages/detail/detail.js');
    detail.onLoad({ mapId, routeId: rootRoute.id, shapeId: '__root__' });
    await new Promise(resolve => setImmediate(resolve));
    assert(detail.data.error !== '', '用例2失败：临时链接解析失败后未落错误态');
    console.log('  用例2 通过：详情页临时链接解析失败 -> 落错误态');
    api.resolveImageUrls = original;
    passed += 1;
  }

  // 用例3：首页主索引读取抛异常 -> onLoad 必须兜住，落空态而非白屏/卡死
  {
    const original = api.getMaps;
    api.getMaps = () => { throw new Error('mock 主索引损坏'); };
    const index = loadPage('pages/index/index.js');
    let crashed = false;
    try { index.onLoad(); } catch (e) { crashed = true; }
    assert(!crashed, '用例3失败：首页 onLoad 未兜住异常（会导致白屏）');
    assert(index.data.loading === false, '用例3失败：首页仍卡在 loading 态');
    console.log('  用例3 通过：首页主索引异常 -> 被兜住并落空态，未崩溃');
    api.getMaps = original;
    passed += 1;
  }

  // 用例4：首页 legacy storage 读取抛异常 -> 被 getRecentViews 内部兜住，主流程不受影响
  {
    const original = wx.getStorageSync;
    wx.getStorageSync = key => {
      if (key === RECENT_HISTORY_KEY) return []; // 确保会走到 legacy 分支
      if (key === RECENT_VIEW_KEY) throw new Error('mock legacy storage 损坏');
      return original(key);
    };
    const index = loadPage('pages/index/index.js');
    let crashed = false;
    try { index.onLoad(); } catch (e) { crashed = true; }
    assert(!crashed, '用例4失败：legacy storage 异常未被兜住');
    assert(index.data.strategies.length > 0, '用例4失败：主流程被 storage 异常影响，攻略列表为空');
    console.log('  用例4 通过：首页 legacy storage 异常 -> 内部兜住，攻略列表正常加载');
    wx.getStorageSync = original;
    passed += 1;
  }

  // 用例5：回归验证——正常路径不受兜底代码影响
  {
    const index = loadPage('pages/index/index.js');
    index.onLoad();
    assert(index.data.strategies.length > 0, '用例5失败：正常路径无法加载攻略列表');
    assert(index.data.loading === false, '用例5失败：正常路径 loading 未关闭');

    const detail = loadPage('pages/detail/detail.js');
    detail.onLoad({ mapId, routeId: rootRoute.id, shapeId: '__root__' });
    await new Promise(resolve => setImmediate(resolve));
    assert(detail.data.strategy && detail.data.strategy.images.length > 0, '用例5失败：正常路径详情页无图片');
    assert(detail.data.error === '', '用例5失败：正常路径误报错误');
    console.log('  用例5 通过：正常路径未受影响（首页列表与详情页图片均正常）');
    passed += 1;
  }

  console.log('FAULT_INJECTION_ALL_OK | passed ' + passed + '/5');
})().catch(err => {
  console.error('异常注入测试失败：' + err.message);
  process.exit(1);
});

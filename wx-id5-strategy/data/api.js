/**
 * 数据源 API 模块 —— 唯一数据读取器 (Single Source of Truth)
 *
 * 所有页面数据（地图/难度/形状/侧门/图片）均来自 data/localMapIndex.js，
 * 该模块由 F:\d5 物理目录扫描生成，是唯一的真实数据源。
 *
 * 注意：微信小程序 require 无法直接加载 .json 文件（会报
 * "module 'xxx.json.js' is not defined"），索引必须使用 .js + module.exports。
 *
 * 已废弃：
 * - jsDelivr CDN 远程拉取
 * - picsum.photos 占位图
 * - 本地兜底 localData.js（已删除）
 * - 云函数调用（cloudfunctions/ 保留但不在本模块中引用）
 */

const mapIndex = require('./localMapIndex.js');

/**
 * 云存储资产映射 { key: fileID }，由 tools/gen-cloud-assets.js 生成。
 * 图片地址解析顺序：云 fileID（真机/预览，无关分包下载）> 本地分包绝对路径（开发兜底）
 */
let cloudMap = null;
let cloudFallbackMap = null;
let cloudKeyMap = null;
const prefetchPromiseMap = {};
function getCloudMap() {
  if (cloudMap === null) {
    try { cloudMap = require('./cloudAssets.js'); }
    catch (e) { cloudMap = {}; }
  }
  return cloudMap;
}

function getCloudAsset(key) {
  const assets = getCloudMap();
  if (assets[key]) return assets[key];
  if (cloudKeyMap === null) {
    cloudKeyMap = {};
    Object.keys(assets).forEach(assetKey => { cloudKeyMap[assetKey.toLowerCase()] = assets[assetKey]; });
  }
  return cloudKeyMap[String(key || '').toLowerCase()] || '';
}

function isCloudReady() {
  try {
    const app = getApp();
    return !!(app && app.globalData && app.globalData.cloudReady);
  } catch (e) {
    return false;
  }
}

/**
 * fileIcons 模式下，路线图与图标文件名可能只差扩展名：
 * 例如路线图为 北-1门.jpg，识别图标为 北-1门.png。
 * 这里返回 iconNamespace 中真实存在的相对路径；无映射时按当前项目约定回退 .png。
 */
function getIconRelPath(route, shape, fileName) {
  const ext = String(fileName || '').toLowerCase();
  const base = String(fileName || '').replace(/\.(jpe?g|png)$/i, '');
  const candidates = [];
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) candidates.push(base + '.png', String(fileName));
  else if (ext.endsWith('.png')) candidates.push(String(fileName), base + '.jpg', base + '.jpeg');
  else candidates.push(String(fileName));

  const namespace = route && route.iconNamespace;
  if (namespace) {
    for (let i = 0; i < candidates.length; i += 1) {
      if (getCloudAsset(namespace + '/' + shape + '/' + candidates[i])) {
        return shape + '/' + candidates[i];
      }
    }
  }
  // 无云映射时按 fileIcons 约定优先使用 PNG 图标。
  return shape + '/' + (ext.endsWith('.png') ? String(fileName) : (base + '.png'));
}

function getAllRoutes() {
  return getMaps().reduce((routes, map) => routes.concat(Array.isArray(map.routes) ? map.routes : []), []);
}

function matchesAuthor(route, author) {
  if (!author) return true;
  return route && (route.authorId === author || route.author === author);
}

function matchesRouteId(route, routeId) {
  return route && (route.id === routeId || (Array.isArray(route.legacyIds) && route.legacyIds.indexOf(routeId) >= 0));
}

function getRouteAssetPaths(route) {
  const paths = [];
  (route.rootFiles || []).forEach(file => paths.push(file));
  (route.shapes || []).forEach(shape => {
    const detail = (route.shapeDetails || {})[shape] || {};
    (detail.rootFiles || []).forEach(file => paths.push(shape + '/' + file));
    (detail.doors || []).forEach(door => {
      (door.files || []).forEach(file => paths.push(shape + '/' + door.door + '/' + file));
    });
  });
  return paths;
}

function getLocalFallback(fileId) {
  if (cloudFallbackMap === null) {
    cloudFallbackMap = {};
    const assets = getCloudMap();
    Object.keys(assets).forEach(key => {
      const slash = key.indexOf('/');
      if (slash < 0) return;
      const localUrl = '/' + key.slice(0, slash) + '/assets/' + key.slice(slash + 1);
      cloudFallbackMap[assets[key]] = localUrl;
    });
    getAllRoutes().forEach(route => {
      const namespace = route.assetNamespace;
      getRouteAssetPaths(route).forEach(relPath => {
        const fileId = (namespace && getCloudAsset(namespace + '/' + relPath)) ||
          (route.legacyCloudPackage && getCloudAsset(route.legacyCloudPackage + '/' + relPath));
        if (fileId) cloudFallbackMap[fileId] = '/' + getPackageRoot(route) + '/assets/' + relPath;
      });
      // entryMode=fileIcons 的图标位于独立 iconPackageRoot，不能靠包名切片推导，必须显式映射。
      if (route.entryMode === 'fileIcons' && route.iconPackageRoot) {
        (route.shapes || []).forEach(shape => {
          const detail = (route.shapeDetails || {})[shape] || {};
          (detail.rootFiles || []).forEach(file => {
            const relPath = getIconRelPath(route, shape, file);
            const fileId = route.iconNamespace ? getCloudAsset(route.iconNamespace + '/' + relPath) : '';
            if (fileId) cloudFallbackMap[fileId] = '/' + route.iconPackageRoot + '/assets/' + relPath;
          });
        });
      }
    });
  }
  return cloudFallbackMap[fileId] || fileId;
}

function rememberPrefetch(key, factory) {
  if (prefetchPromiseMap[key]) return prefetchPromiseMap[key];
  const promise = factory();
  prefetchPromiseMap[key] = promise;
  promise.then(() => {
    if (prefetchPromiseMap[key] === promise) delete prefetchPromiseMap[key];
  }).catch(() => {
    if (prefetchPromiseMap[key] === promise) delete prefetchPromiseMap[key];
  });
  return promise;
}

/**
 * 获取全部地图（当前仅一张：厄运之女）
 */
function getMaps() {
  return mapIndex.maps || [];
}

/**
 * 获取图鉴扩展条目（异象 anomaly / 回收物资 material）
 * 索引数据防御：inventoryData 缺失/非数组时返回空数组，避免上层崩溃
 */
function getInventoryData() {
  return Array.isArray(mapIndex.inventoryData) ? mapIndex.inventoryData : [];
}

/**
 * 获取辞章条目（chapter：常规辞章 / 联动辞章）
 */
function getChapterData() {
  return Array.isArray(mapIndex.chapterData) ? mapIndex.chapterData : [];
}

/**
 * 按 id 获取单个地图
 */
function getMapById(mapId) {
  const maps = getMaps();
  return maps.find(m => m && m.id === mapId) || null;
}

function getAuthorsByMapId(mapId) {
  const map = getMapById(mapId);
  if (!map) return [];
  const visibleRoutes = getRoutesByMapId(mapId);
  const configured = Array.isArray(map.authors) ? map.authors : [];
  const authors = [];
  const seen = {};
  configured.forEach(author => {
    if (!author || !author.id || !visibleRoutes.some(route => matchesAuthor(route, author.id))) return;
    authors.push({ id: author.id, name: author.name || author.id });
    seen[author.id] = true;
  });
  visibleRoutes.forEach(route => {
    const id = route.authorId || route.author || 'other';
    if (seen[id]) return;
    authors.push({ id, name: route.author || id });
    seen[id] = true;
  });
  return authors;
}

/**
 * 获取某地图下的全部路线（难度）数组
 * 索引数据防御：routes 缺失/非数组时返回空数组，避免上层崩溃
 */
function getRoutesByMapId(mapId) {
  const map = getMapById(mapId);
  const routes = map && Array.isArray(map.routes) ? map.routes : [];
  // 隐藏路线（hidden: true）不出现在任何列表，但数据与资源保留
  return routes.filter(r => !r.hidden);
}

/**
 * 按路线 id（难度）获取路线详情
 */
function getRoute(mapId, routeId, author) {
  const routes = getRoutesByMapId(mapId).filter(route => matchesAuthor(route, author));
  return routes.find(route => route && route.id === routeId) ||
    routes.find(route => matchesRouteId(route, routeId)) || null;
}

/**
 * 获取某路线下的形状列表（字符串数组，如 ["┏","┗","┣"]）
 */
function getShapes(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  return route && Array.isArray(route.shapes) ? route.shapes : [];
}

/**
 * 获取形状详情（侧门方向、各侧门下的图片文件列表、形状根目录散图）
 * 返回：{ shape, doors: [{ door, files }], rootFiles: [...] }；doors/rootFiles 防御为数组
 */
function getShapeDetails(mapId, routeId, shape) {
  const route = getRoute(mapId, routeId);
  if (!route) return null;
  const detail = (route.shapeDetails || {})[shape];
  if (!detail) return null;
  return {
    shape: shape,
    doors: Array.isArray(detail.doors) ? detail.doors : [],
    rootFiles: Array.isArray(detail.rootFiles) ? detail.rootFiles : []
  };
}

/**
 * 获取某路线根目录下散落的图片（如新手模式的单张整图）
 */
function getRootImages(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  return route && Array.isArray(route.rootFiles) ? route.rootFiles : [];
}

/**
 * 解析当前图片根路径：
 * - 若 map 配置了 assetBase（CDN URL 或 /pkg-xx/assets/ 绝对路径），使用之
 * - 否则按路线所属分包生成绝对路径 /pkg-{routeId}/assets/（detail 页位于主包，必须用绝对路径）
 */
function resolveBase(map, route) {
  const m = map || {};
  if (m.assetBase) return m.assetBase;
  if (route) return '/' + getPackageRoot(route) + '/assets/';
  return '';
}

/**
 * 构建形状下某张图片的路径
 * 规则：云存储 fileID（cloud://...）优先；未上传时回退 resolveBase + shape + "/" + door + "/" + fileName
 */
function cloudUrl(route, relPath) {
  if (!isCloudReady()) return '';
  const assets = getCloudMap();
  const namespace = route && route.assetNamespace;
  const legacyPackage = route && route.legacyCloudPackage;
  return (namespace && getCloudAsset(namespace + '/' + relPath)) ||
    (legacyPackage && getCloudAsset(legacyPackage + '/' + relPath)) || '';
}

function buildImageUrl(mapId, routeId, shape, door, fileName) {
  const map = getMapById(mapId);
  const route = getRoute(mapId, routeId);
  if (!map || !route || !shape || !door || !fileName) return '';
  const relPath = shape + '/' + door + '/' + fileName;
  return cloudUrl(route, relPath) || resolveBase(map, route) + relPath;
}

/**
 * 获取某形状根目录下的散图完整路径数组（如 ┗\侧门在右.jpg，不经过侧门子文件夹）
 */
function getShapeRootImageUrls(mapId, routeId, shape) {
  const map = getMapById(mapId);
  const route = getRoute(mapId, routeId);
  if (!map || !route || !shape) return [];
  const detail = getShapeDetails(mapId, routeId, shape);
  const base = resolveBase(map, route);
  return ((detail && detail.rootFiles) || []).map(f => cloudUrl(route, shape + '/' + f) || base + shape + '/' + f);
}

/**
 * 获取某个形状下识别图标的本地路径。
 * 图标路径规则：iconPackageRoot/assets/{shape}/{fileName}。
 */
function getShapeIconLocalUrl(mapId, routeId, shape, fileName) {
  const route = getRoute(mapId, routeId);
  if (!route || !route.iconPackageRoot || !shape || !fileName) return '';
  const relPath = getIconRelPath(route, shape, fileName);
  return '/' + route.iconPackageRoot + '/assets/' + relPath;
}

/**
 * 获取某个形状下识别图标的本地/云端地址。
 * 与攻略图 cloudUrl 一样：云不可用时必须直接使用本地图标，不能返回无法展示的 cloud://。
 */
function getShapeIconUrl(mapId, routeId, shape, fileName) {
  const localUrl = getShapeIconLocalUrl(mapId, routeId, shape, fileName);
  if (!localUrl || !isCloudReady()) return localUrl;
  const route = getRoute(mapId, routeId);
  const relPath = getIconRelPath(route, shape, fileName);
  const cloudFileId = route.iconNamespace ? getCloudAsset(route.iconNamespace + '/' + relPath) : '';
  return cloudFileId || localUrl;
}

/**
 * 获取某形状下的全部图片路径数组（各侧门子目录 + 形状根目录散图）
 */
function getImagesForShape(mapId, routeId, shape) {
  const detail = getShapeDetails(mapId, routeId, shape);
  if (!detail) return [];
  const urls = [];
  detail.doors.forEach(door => {
    (door.files || []).forEach(f => {
      urls.push(buildImageUrl(mapId, routeId, shape, door.door, f));
    });
  });
  return urls.concat(getShapeRootImageUrls(mapId, routeId, shape));
}

/**
 * 获取某路线根目录散图的完整路径数组（含 assetBase 前缀）
 */
function getRootImageUrls(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  const map = getMapById(mapId);
  if (!map || !route) return [];
  const base = resolveBase(map, route);
  return (route.rootFiles || []).map(f => cloudUrl(route, f) || base + f);
}

const FILEURL_CACHE_KEY = 'id5_fileurl_v1';
const FILEURL_TTL = 90 * 60 * 1000; // 临时链接有效期约 2 小时，缓存 90 分钟
const FILEURL_BATCH_SIZE = 50; // wx.cloud.getTempFileURL 单次 fileList 上限
const FILEURL_CACHE_MAX = 400; // 本地缓存最多保留条数，防止 storage 无限增长

function saveFileUrlCache(cache) {
  try {
    const keys = Object.keys(cache);
    if (keys.length > FILEURL_CACHE_MAX) {
      const pruned = {};
      keys
        .sort((a, b) => ((cache[b] && cache[b].ts) || 0) - ((cache[a] && cache[a].ts) || 0))
        .slice(0, FILEURL_CACHE_MAX)
        .forEach(key => { pruned[key] = cache[key]; });
      cache = pruned;
    }
    wx.setStorageSync(FILEURL_CACHE_KEY, cache);
  } catch (e) {}
}

/**
 * 把 cloud:// fileID 批量解析为 https 临时链接（wx.cloud.getTempFileURL）
 * - 非 cloud:// 的 URL（CDN 图/本地路径）原样透传
 * - 带本地缓存（storage），缓存命中不发请求
 * - 单条或整体失败时回退对应本地分包路径，不阻塞页面
 */
function resolveImageUrls(fileIds) {
  const source = Array.isArray(fileIds) ? fileIds : [];
  const list = source.filter(id => typeof id === 'string' && id.indexOf('cloud://') === 0);
  if (!list.length) return Promise.resolve(source);
  if (!wx.cloud || !wx.cloud.getTempFileURL) {
    return Promise.resolve(source.map(getLocalFallback));
  }
  let cache = {};
  try { cache = wx.getStorageSync(FILEURL_CACHE_KEY) || {}; } catch (e) { cache = {}; }
  const now = Date.now();
  const urlMap = {};
  const need = [];
  list.forEach(fid => {
    const hit = cache[fid];
    if (hit && hit.url && now - hit.ts < FILEURL_TTL) urlMap[fid] = hit.url;
    else need.push(fid);
  });
  const apply = () => source.map(fid =>
    (typeof fid === 'string' && fid.indexOf('cloud://') === 0)
      ? (urlMap[fid] || getLocalFallback(fid))
      : fid
  );
  if (!need.length) return Promise.resolve(apply());

  const batches = [];
  for (let i = 0; i < need.length; i += FILEURL_BATCH_SIZE) {
    batches.push(need.slice(i, i + FILEURL_BATCH_SIZE));
  }
  return Promise.all(batches.map(batch =>
    wx.cloud.getTempFileURL({ fileList: batch }).then(res => {
      (res.fileList || []).forEach(it => {
        if (it.status === 0 && it.tempFileURL) {
          urlMap[it.fileID] = it.tempFileURL;
          cache[it.fileID] = { url: it.tempFileURL, ts: now };
        } else {
          console.warn('[api] getTempFileURL 单条失败:', it && it.fileID, it && it.errMsg);
        }
      });
    }).catch(err => {
      console.error('[api] getTempFileURL 分批请求失败:', err && err.errMsg || err);
    })
  )).then(() => {
    saveFileUrlCache(cache);
    return apply();
  });
}

/**
 * 获取某难度路线对应的分包根目录（例如 'pkg-zhanshi-hard-full'）
 */
function getPackageRoot(routeOrId) {
  if (routeOrId && typeof routeOrId === 'object') {
    return routeOrId.packageRoot || 'pkg-' + routeOrId.id;
  }
  const routeId = routeOrId || '';
  const route = getAllRoutes().find(item => item.id === routeId) || getAllRoutes().find(item => matchesRouteId(item, routeId));
  return (route && route.packageRoot) || 'pkg-' + routeId;
}

/**
 * 确保某个分包已经下载。
 */
function loadPackage(packageRoot) {
  if (!packageRoot || !wx.loadSubpackage) return Promise.resolve();
  return new Promise(resolve => {
    wx.loadSubpackage({
      name: packageRoot,
      success: resolve,
      fail(err) {
        console.warn('[api] 分包加载失败，将继续尝试其他来源: ' + packageRoot, err && err.errMsg || err);
        resolve();
      }
    });
  });
}

/**
 * 确保路线对应的图片分包已经加载。
 * 云图片解析失败或分享直达详情页时，本地素材回退依赖该分包。
 */
function loadRoutePackage(routeId) {
  return loadPackage(getPackageRoot(routeId));
}

/**
 * 预下载 fileIcons 图标分包，并把所有识别图标的 cloud:// fileID 提前解析为 HTTPS。
 * 返回 { [shape + '|' + fileName]: url }，查询页可先落缓存，打开图标弹层时直接使用。
 */
function prefetchRouteImageUrls(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  if (!route || !route.packageRoot) return Promise.resolve({});
  return rememberPrefetch('route:' + route.id, () => {
    const fileIds = [];
    const relPaths = [];
    getRouteAssetPaths(route).forEach(relPath => {
      const fileId = (route.assetNamespace && getCloudAsset(route.assetNamespace + '/' + relPath)) ||
        (route.legacyCloudPackage && getCloudAsset(route.legacyCloudPackage + '/' + relPath)) || '';
      relPaths.push(relPath);
      fileIds.push(fileId);
    });
    return loadPackage(route.packageRoot).then(() => {
      if (!isCloudReady()) {
        const base = resolveBase(getMapById(mapId), route);
        const map = {};
        relPaths.forEach((relPath, index) => { map[relPath] = base + relPath; });
        return map;
      }
      return resolveImageUrls(fileIds).then(urls => {
        const map = {};
        relPaths.forEach((relPath, index) => {
          const url = urls[index];
          if (url && url.indexOf('cloud://') !== 0) map[relPath] = url;
        });
        return map;
      });
    });
  });
}

function prefetchIconUrls(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  if (!route || route.entryMode !== 'fileIcons' || !route.iconPackageRoot) {
    return Promise.resolve({});
  }
  return rememberPrefetch('icons:' + route.id, () => {
  const cacheKeyList = [];
  const fileIds = [];
  (route.shapes || []).forEach(shape => {
    const detail = (route.shapeDetails || {})[shape] || {};
    (detail.rootFiles || []).forEach(file => {
      cacheKeyList.push(shape + '|' + file);
      const relPath = getIconRelPath(route, shape, file);
      const fileId = route.iconNamespace ? getCloudAsset(route.iconNamespace + '/' + relPath) : '';
      fileIds.push(fileId || '');
    });
  });

  return loadPackage(route.iconPackageRoot).then(() => {
    if (!isCloudReady()) {
      const map = {};
      cacheKeyList.forEach((key, index) => {
        const file = String(key).split('|').pop();
        const shape = String(key).split('|').shift();
        map[key] = getShapeIconLocalUrl(mapId, routeId, shape, file);
      });
      return map;
    }
      return resolveImageUrls(fileIds).then(urls => {
        const map = {};
        cacheKeyList.forEach((key, index) => {
          const url = urls[index];
          if (url && url.indexOf('cloud://') !== 0) map[key] = url;
        });
        return map;
      });
    });
  });
}

module.exports = {
  getMaps,
  getInventoryData,
  getChapterData,
  getMapById,
  getAuthorsByMapId,
  getRoutesByMapId,
  getRoute,
  getShapes,
  getShapeDetails,
  getRootImages,
  getRootImageUrls,
  getShapeRootImageUrls,
  getShapeIconUrl,
  getShapeIconLocalUrl,
  getPackageRoot,
  loadRoutePackage,
  prefetchRouteImageUrls,
  prefetchIconUrls,
  getLocalFallback,
  buildImageUrl,
  getImagesForShape,
  resolveImageUrls
};

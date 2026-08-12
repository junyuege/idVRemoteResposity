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
 * 云存储资产映射 { key: fileID }，由 tools/upload-assets.js 生成。
 * 图片地址解析顺序：云 fileID（真机/预览，无关分包下载）> 本地分包绝对路径（开发兜底）
 */
let cloudMap = null;
function getCloudMap() {
  if (cloudMap === null) {
    try { cloudMap = require('./cloudAssets.js'); }
    catch (e) { cloudMap = {}; }
  }
  return cloudMap;
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
  return maps.find(m => m && m.id === mapId) || maps[0] || null;
}

/**
 * 获取某地图下的全部路线（难度）数组
 * 索引数据防御：routes 缺失/非数组时返回空数组，避免上层崩溃
 */
function getRoutesByMapId(mapId) {
  const map = getMapById(mapId);
  return map && Array.isArray(map.routes) ? map.routes : [];
}

/**
 * 按路线 id（难度）获取路线详情
 */
function getRoute(mapId, routeId) {
  return getRoutesByMapId(mapId).find(r => r && r.id === routeId) || null;
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
  if (route) return '/' + getPackageRoot(route.id) + '/assets/';
  return '';
}

/**
 * 构建形状下某张图片的路径
 * 规则：云存储 fileID（cloud://...）优先；未上传时回退 resolveBase + shape + "/" + door + "/" + fileName
 */
function cloudUrl(pkg, relPath) {
  return getCloudMap()[pkg + '/' + relPath] || '';
}

function buildImageUrl(mapId, routeId, shape, door, fileName) {
  const map = getMapById(mapId);
  const route = getRoute(mapId, routeId);
  if (!map || !route || !shape || !door || !fileName) return '';
  const pkg = getPackageRoot(routeId);
  const relPath = shape + '/' + door + '/' + fileName;
  return cloudUrl(pkg, relPath) || resolveBase(map, route) + relPath;
}

/**
 * 获取某形状根目录下的散图完整路径数组（如 ┗\侧门在右.jpg，不经过侧门子文件夹）
 */
function getShapeRootImageUrls(mapId, routeId, shape) {
  const map = getMapById(mapId);
  const route = getRoute(mapId, routeId);
  if (!map || !route || !shape) return [];
  const detail = getShapeDetails(mapId, routeId, shape);
  const pkg = getPackageRoot(routeId);
  const base = resolveBase(map, route);
  return ((detail && detail.rootFiles) || []).map(f => cloudUrl(pkg, shape + '/' + f) || base + shape + '/' + f);
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
  const pkg = getPackageRoot(routeId);
  return (route.rootFiles || []).map(f => cloudUrl(pkg, f) || base + f);
}

/**
 * 路线难度 -> 分包根目录映射（subPackage root）
 * 新路线可映射到任意已有分包；未知难度回退 pkg-{routeId}
 */
const ROUTE_PACKAGE = {
  hard: 'pkg-hard',
  hard_fast: 'pkg-hard',
  normal: 'pkg-normal',
  easy: 'pkg-easy',
  newbie: 'pkg-newbie'
};

const FILEURL_CACHE_KEY = 'id5_fileurl_v1';
const FILEURL_TTL = 90 * 60 * 1000; // 临时链接有效期约 2 小时，缓存 90 分钟

/**
 * 把 cloud:// fileID 批量解析为 https 临时链接（wx.cloud.getTempFileURL）
 * - 非 cloud:// 的 URL（CDN 图/本地路径）原样透传
 * - 带本地缓存（storage），缓存命中不发请求
 * - 失败时回退原 fileID（真机可能仍可渲染），不阻塞页面
 */
function resolveImageUrls(fileIds) {
  const list = fileIds.filter(id => typeof id === 'string' && id.indexOf('cloud://') === 0);
  if (!list.length) return Promise.resolve(fileIds);
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
  const apply = () => fileIds.map(fid =>
    (typeof fid === 'string' && fid.indexOf('cloud://') === 0) ? (urlMap[fid] || fid) : fid
  );
  if (!need.length) return Promise.resolve(apply());
  return wx.cloud.getTempFileURL({ fileList: need }).then(res => {
    (res.fileList || []).forEach(it => {
      if (it.status === 0 && it.tempFileURL) {
        urlMap[it.fileID] = it.tempFileURL;
        cache[it.fileID] = { url: it.tempFileURL, ts: now };
      } else {
        console.warn('[api] getTempFileURL 单条失败:', it && it.fileID, it && it.errMsg);
      }
    });
    try { wx.setStorageSync(FILEURL_CACHE_KEY, cache); } catch (e) {}
    return apply();
  }).catch(err => {
    console.error('[api] getTempFileURL 整体失败:', err && err.errMsg || err);
    return apply();
  });
}

/**
 * 获取某难度路线对应的分包根目录（如 'pkg-hard'）
 */
function getPackageRoot(routeId) {
  return ROUTE_PACKAGE[routeId] || 'pkg-' + routeId;
}

module.exports = {
  getMaps,
  getInventoryData,
  getChapterData,
  getMapById,
  getRoutesByMapId,
  getRoute,
  getShapes,
  getShapeDetails,
  getRootImages,
  getRootImageUrls,
  getShapeRootImageUrls,
  getPackageRoot,
  buildImageUrl,
  getImagesForShape,
  resolveImageUrls
};
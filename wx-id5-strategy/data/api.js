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
 * 获取全部地图（当前仅一张：厄运之女）
 */
function getMaps() {
  return mapIndex.maps || [];
}

/**
 * 按 id 获取单个地图
 */
function getMapById(mapId) {
  const maps = getMaps();
  return maps.find(m => m.id === mapId) || maps[0] || null;
}

/**
 * 获取某地图下的全部路线（难度）数组
 */
function getRoutesByMapId(mapId) {
  const map = getMapById(mapId);
  return map ? map.routes : [];
}

/**
 * 按路线 id（难度）获取路线详情
 */
function getRoute(mapId, routeId) {
  return getRoutesByMapId(mapId).find(r => r.id === routeId) || null;
}

/**
 * 获取某路线下的形状列表（字符串数组，如 ["┏","┗","┣"]）
 */
function getShapes(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  return route ? (route.shapes || []) : [];
}

/**
 * 获取形状详情（侧门方向、各侧门下的图片文件列表）
 * 返回：{ shape, doors: [{ door, files }] }
 */
function getShapeDetails(mapId, routeId, shape) {
  const route = getRoute(mapId, routeId);
  if (!route) return null;
  const detail = (route.shapeDetails || {})[shape];
  if (!detail) return null;
  return { shape: shape, doors: detail.doors || [] };
}

/**
 * 获取某路线根目录下散落的图片（如新手模式的单张整图）
 */
function getRootImages(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  return route ? (route.rootFiles || []) : [];
}

/**
 * 解析当前图片根路径：
 * - 若 map 配置了 assetBase（本地分包素材，如 "../../assets/"），使用之
 * - 否则回退到 F:\d5 绝对路径（仅本地调试，上线必须配置 assetBase）
 */
function resolveBase(map, route) {
  const m = map || {};
  if (m.assetBase) return m.assetBase;
  if (m.sourceAnchor && route) return m.sourceAnchor + route.shapeDir + '/';
  return '';
}

/**
 * 构建形状下某张图片的路径
 * 规则：assetBase + shape + "/" + door + "/" + fileName
 *     或（未配置 assetBase 时）sourceAnchor + shapeDir + "/" + shape + "/" + door + "/" + fileName
 */
function buildImageUrl(mapId, routeId, shape, door, fileName) {
  const map = getMapById(mapId);
  const route = getRoute(mapId, routeId);
  if (!map || !route || !shape || !door || !fileName) return '';
  return resolveBase(map, route) + shape + '/' + door + '/' + fileName;
}

/**
 * 获取某形状下的全部图片路径数组
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
  return urls;
}

/**
 * 获取某路线根目录散图的完整路径数组（含 assetBase 前缀）
 */
function getRootImageUrls(mapId, routeId) {
  const route = getRoute(mapId, routeId);
  const map = getMapById(mapId);
  if (!map || !route) return [];
  const base = resolveBase(map, route);
  return (route.rootFiles || []).map(f => base + f);
}

module.exports = {
  getMaps,
  getMapById,
  getRoutesByMapId,
  getRoute,
  getShapes,
  getShapeDetails,
  getRootImages,
  getRootImageUrls,
  buildImageUrl,
  getImagesForShape
};
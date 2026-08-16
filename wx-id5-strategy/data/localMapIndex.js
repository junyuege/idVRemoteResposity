// data/localMapIndex.js (SSOT)
// 唯一真实数据源入口：地图路线与图鉴数据分别维护在 data/source/ 下。
// 页面请通过 data/api.js 读取，不要直接 require 本文件之外的源文件。
const encyclopedia = require('./source/encyclopedia.js');
const maps = require('./source/maps.js');

module.exports = {
  version: '2.1',
  inventoryData: encyclopedia.inventoryData || [],
  chapterData: encyclopedia.chapterData || [],
  maps: maps || []
};

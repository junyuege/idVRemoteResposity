const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function requireFresh(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  delete require.cache[require.resolve(absolutePath)];
  return require(absolutePath);
}

function setByPath(target, key, value) {
  const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cursor[parts[i]] == null) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

const storage = {};
const loadedPackages = [];
const navigationCalls = [];
global.wx = {
  env: { USER_DATA_PATH: path.join(ROOT, '.tmp', 'feedback-draft') },
  cloud: {
    getTempFileURL({ fileList }) {
      return Promise.resolve({
        fileList: fileList.map(fileID => ({
          fileID,
          status: 0,
          tempFileURL: 'https://example.invalid/' + encodeURIComponent(fileID)
        }))
      });
    },
    uploadFile() { return Promise.resolve({ fileID: 'cloud://mock/feedback.jpg' }); },
    callFunction() { return Promise.resolve({ result: { code: 0, data: 'mock-id' } }); }
  },
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; },
  setNavigationBarTitle() {},
  loadSubpackage({ name, success }) {
    loadedPackages.push(name);
    if (success) success();
  },
  showToast() {},
  hideLoading() {},
  showLoading() {},
  stopPullDownRefresh() {},
  navigateTo(options) { navigationCalls.push({ method: 'navigateTo', url: options.url }); },
  redirectTo(options) { navigationCalls.push({ method: 'redirectTo', url: options.url }); },
  switchTab() {},
  previewImage() {},
  getFileSystemManager() {
    return {
      accessSync(p) { fs.accessSync(p); },
      mkdirSync(p) { fs.mkdirSync(p, { recursive: true }); },
      copyFileSync(src, dst) { fs.copyFileSync(src, dst); },
      unlinkSync(p) { fs.unlinkSync(p); }
    };
  }
};
global.getApp = () => ({ globalData: { appVersion: '1.0.0', cloudReady: false } });

function loadPage(relativePath) {
  let definition = null;
  global.Page = config => { definition = config; };
  requireFresh(relativePath);
  check(definition && typeof definition === 'object', relativePath + ' did not register a Page');
  if (!definition) return null;
  const page = Object.assign({}, definition);
  page.data = JSON.parse(JSON.stringify(definition.data || {}));
  page.setData = function setData(patch, callback) {
    Object.keys(patch).forEach(key => setByPath(this.data, key, patch[key]));
    if (callback) callback();
  };
  return page;
}

function registeredPagePaths(appConfig) {
  const pages = (appConfig.pages || []).slice();
  const subPages = (appConfig.subPackages || []).flatMap(pkg =>
    (pkg.pages || []).map(page => path.posix.join(pkg.root, page))
  );
  return pages.concat(subPages);
}

function validateRegisteredPages(appConfig) {
  const pages = appConfig.pages || [];
  registeredPagePaths(appConfig).forEach(page => {
    ['js', 'json', 'wxml', 'wxss'].forEach(ext => {
      check(fs.existsSync(path.join(ROOT, page + '.' + ext)), page + '.' + ext + ' is missing');
    });
  });

  const tabPages = ((appConfig.tabBar && appConfig.tabBar.list) || []).map(item => item.pagePath);
  tabPages.forEach(page => check(pages.includes(page), 'Tab page is not registered: ' + page));
}

function validatePackConfig() {
  const projectConfig = readJson('project.config.json');
  const ignoreRules = (projectConfig.packOptions && projectConfig.packOptions.ignore) || [];
  check(ignoreRules.some(rule => rule.type === 'folder' && rule.value === 'tools'), 'Build should exclude the tools directory');
  check(ignoreRules.some(rule => rule.type === 'folder' && rule.value === 'docs'), 'Build should exclude the docs directory');
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  check(gitignore.indexOf('project.private.config.json') >= 0, '.gitignore should include project.private.config.json');
}

function validateCloudFunctionPackage() {
  ['addFeedback', 'addAnalytics', 'adminApi'].forEach(name => {
    const packageJson = readJson('cloudfunctions/' + name + '/package.json');
    const sdkVersion = packageJson.dependencies && packageJson.dependencies['wx-server-sdk'];
    check(Boolean(sdkVersion) && !/latest/i.test(sdkVersion), 'cloudfunctions/' + name + ' should pin wx-server-sdk version');
    check(fs.existsSync(path.join(ROOT, 'cloudfunctions', name, 'index.js')), 'cloudfunctions/' + name + ' should have index.js');
  });
}

function validateToolchain() {
  check(fs.existsSync(path.join(ROOT, 'tools', 'sync-assets.js')), 'Missing cross-platform tools/sync-assets.js');
  check(fs.existsSync(path.join(ROOT, 'tools', 'smoke-test.js')), 'Missing tools/smoke-test.js');
  const syncPackage = readJson('tools/package.json');
  const sharpVersion = syncPackage.dependencies && syncPackage.dependencies.sharp;
  check(Boolean(sharpVersion) && !/latest/i.test(sharpVersion), 'tools/package.json should pin sharp version');

  ['pkg-hard', 'pkg-normal', 'pkg-easy', 'pkg-newbie', 'pkg-v0710'].forEach(root => {
    check(!fs.existsSync(path.join(ROOT, root)), 'Legacy local package should be removed: ' + root);
  });

  const index = requireFresh('data/localMapIndex.js');
  const lianghapi = (index.maps || []).flatMap(map => map.routes || []).find(route => route.id === 'lianghapi-v0710');
  check(Boolean(lianghapi), 'lianghapi-v0710 route is missing');
  if (lianghapi) {
    check(!lianghapi.legacyCloudPackage, 'lianghapi-v0710 should not use legacyCloudPackage');
    check(lianghapi.iconNamespace === 'maps/e_yun_zhi_nv/lianghapi/v0710/icons', 'lianghapi iconNamespace should use maps namespace');
  }

  const cloudAssets = requireFresh('data/cloudAssets.js');
  check(!Object.keys(cloudAssets).some(key => key.indexOf('pkg-v0710') === 0), 'cloudAssets should not contain pkg-v0710 keys');

  const importReport = readJson('tools/import-report.json');
  check(Array.isArray(importReport) && importReport.length >= 7, 'import-report.json should cover route packages and icon package');
  check(importReport.some(item => item.Pkg === 'pkg-lianghapi-icons'), 'import-report.json should include pkg-lianghapi-icons');
}

function validateCloudConfig() {
  const config = requireFresh('config/cloud.js');
  check(Boolean(config && config.envId), 'config/cloud.js is missing envId');
  check(Boolean(config && config.storagePrefix && config.storagePrefix.indexOf('cloud://') === 0), 'config/cloud.js is missing a cloud:// storagePrefix');
  check(config.storagePrefix.indexOf(config.envId) >= 0, 'config/cloud.js storagePrefix should contain envId');
  const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  check(appSource.indexOf("require('./config/cloud.js')") >= 0, 'app.js should read cloud config from config/cloud.js');
  const genSource = fs.readFileSync(path.join(ROOT, 'tools', 'gen-cloud-assets.js'), 'utf8');
  check(genSource.indexOf("require('../config/cloud.js')") >= 0, 'gen-cloud-assets.js should read cloud config from config/cloud.js');
}

function validateBindings(appConfig) {
  registeredPagePaths(appConfig).forEach(pagePath => {
    const page = loadPage(pagePath + '.js');
    const wxml = fs.readFileSync(path.join(ROOT, pagePath + '.wxml'), 'utf8');
    const eventPattern = /(?:bind|catch)(?:tap|longpress|input|confirm|error|change|load|submit|focus|blur|scroll|touchstart|touchmove|touchend)="([A-Za-z_$][\w$]*)"/g;
    let match = eventPattern.exec(wxml);
    while (match) {
      check(page && typeof page[match[1]] === 'function', pagePath + ' is missing event handler ' + match[1]);
      match = eventPattern.exec(wxml);
    }
  });
}

function validateWxmlStructure(appConfig) {
  const voidTags = new Set(['image', 'input', 'textarea']);
  registeredPagePaths(appConfig).forEach(pagePath => {
    const source = fs.readFileSync(path.join(ROOT, pagePath + '.wxml'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/{{[\s\S]*?}}/g, 'EXPR');
    const stack = [];
    const tagPattern = /<\/?([A-Za-z][\w-]*)(?:\s[^<>]*?)?\s*\/?>/g;
    let match = tagPattern.exec(source);
    while (match) {
      const token = match[0];
      const tag = match[1];
      if (token.startsWith('</')) {
        const openingTag = stack.pop();
        check(openingTag === tag, pagePath + ' has mismatched tag: expected ' + openingTag + ', found ' + tag);
      } else if (!token.endsWith('/>') && !voidTags.has(tag)) {
        stack.push(tag);
      }
      match = tagPattern.exec(source);
    }
    check(stack.length === 0, pagePath + ' has unclosed tags: ' + stack.join(', '));
  });
}

function expectedAssetPaths(route) {
  const paths = [];
  (route.rootFiles || []).forEach(file => paths.push(file));
  (route.shapes || []).forEach(shape => {
    const detail = (route.shapeDetails || {})[shape] || {};
    (detail.rootFiles || []).forEach(file => paths.push(path.posix.join(shape, file)));
    (detail.doors || []).forEach(door => {
      (door.files || []).forEach(file => paths.push(path.posix.join(shape, door.door, file)));
    });
  });
  return paths;
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function validatePackageImageFormats(packageRoots) {
  const seen = new Set();
  packageRoots.forEach(root => {
    if (!root || seen.has(root)) return;
    seen.add(root);
    walkFiles(path.join(ROOT, root, 'assets')).forEach(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return;
      const buf = fs.readFileSync(filePath);
      const isJpeg = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
      const isPng = buf.length > 7 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
      if (ext === '.png') {
        check(isPng, 'Image extension/content mismatch (expected PNG): ' + filePath);
      } else {
        check(isJpeg, 'Image extension/content mismatch (expected JPEG): ' + filePath);
      }
    });
  });
}

async function validateDataFlow() {
  const api = requireFresh('data/api.js');
  const cloudAssets = requireFresh('data/cloudAssets.js');
  const maps = api.getMaps();
  check(maps.length > 0, 'No maps are available');

  // 检查所有在索引中登记过的图片分包，确保扩展名与文件头一致。
  const rawIndex = requireFresh('data/localMapIndex.js');
  const imageMeta = requireFresh('data/imageMeta.js');
  check(Object.keys(imageMeta).length >= 123, 'data/imageMeta.js should cover all route images');
  const indexedPackages = [];
  (rawIndex.maps || []).forEach(map => (map.routes || []).forEach(route => {
    if (route.packageRoot) indexedPackages.push(route.packageRoot);
    if (route.iconPackageRoot) indexedPackages.push(route.iconPackageRoot);
  }));
  validatePackageImageFormats(indexedPackages);

  let routeCount = 0;
  let shapeCount = 0;
  let imageCount = 0;

  maps.forEach(map => {
    const routes = api.getRoutesByMapId(map.id);
    check(routes.length > 0, 'No visible routes for map ' + map.id);
    routes.forEach(route => {
      routeCount += 1;
      check(Boolean(route.authorId), 'Route is missing authorId: ' + route.id);
      check(Boolean(route.difficulty), 'Route is missing difficulty: ' + route.id);
      check(Boolean(route.packageRoot), 'Route is missing packageRoot: ' + route.id);
      check(Boolean(route.assetNamespace), 'Route is missing assetNamespace: ' + route.id);
      const packageRoot = api.getPackageRoot(route);
      check(fs.existsSync(path.join(ROOT, packageRoot)), 'Missing package ' + packageRoot);

      expectedAssetPaths(route).forEach(relativePath => {
        imageCount += 1;
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const cloudKey = route.assetNamespace + '/' + normalizedPath;
        const legacyCloudKey = route.legacyCloudPackage ? route.legacyCloudPackage + '/' + normalizedPath : '';
        const localPath = path.join(ROOT, packageRoot, 'assets', ...relativePath.split('/'));
        const lowerCloudAssets = Object.keys(cloudAssets).reduce((lookup, key) => {
          lookup[key.toLowerCase()] = cloudAssets[key];
          return lookup;
        }, {});
        check(Boolean(cloudAssets[cloudKey]) || Boolean(lowerCloudAssets[cloudKey.toLowerCase()]) || Boolean(legacyCloudKey && (cloudAssets[legacyCloudKey] || lowerCloudAssets[legacyCloudKey.toLowerCase()])) || fs.existsSync(localPath), 'Missing image asset ' + cloudKey);
        check(fs.existsSync(localPath), 'Missing local fallback image ' + localPath);
      });

      if (route.entryMode === 'fileIcons' && route.iconPackageRoot) {
        (route.shapes || []).forEach(shape => {
          const detail = (route.shapeDetails || {})[shape] || {};
          (detail.rootFiles || []).forEach(file => {
            const iconUrl = api.getShapeIconLocalUrl(map.id, route.id, shape, file);
            check(iconUrl.indexOf('/pkg-') === 0 && fs.existsSync(path.join(ROOT, ...iconUrl.slice(1).split('/'))), 'Missing icon fallback image ' + iconUrl);
          });
        });
      }

      const shapes = api.getShapes(map.id, route.id);
      shapeCount += shapes.length;
      shapes.forEach(shape => {
        const detail = api.getShapeDetails(map.id, route.id, shape);
        check(Boolean(detail), 'Missing shape detail for ' + route.id + '/' + shape);
        if (detail) {
          (detail.doors || []).forEach(door => {
            check(Array.isArray(door.files) && door.files.length > 0, 'Door entry has no files: ' + route.id + '/' + shape + '/' + door.door);
          });
        }
      });
    });
  });

  check(api.getMapById('__missing__') === null, 'Unknown map should not fall back to the first map');
  check(api.getRoute(maps[0].id, '__missing__') === null, 'Unknown route should not fall back');

  maps.forEach(map => {
    const ids = api.getRoutesByMapId(map.id).map(route => route.id);
    check(new Set(ids).size === ids.length, 'Route ids must be unique within map ' + map.id);
    const authors = api.getAuthorsByMapId(map.id);
    check(authors.length >= 2, 'Expected multiple visible authors for map ' + map.id);
    api.getRoutesByMapId(map.id).forEach(route => {
      (route.legacyIds || []).forEach(legacyId => {
        check(api.getRoute(map.id, legacyId, route.authorId).id === route.id, 'Legacy route id did not resolve: ' + legacyId);
      });
    });
  });

  const firstCloudId = Object.values(cloudAssets)[0];
  if (firstCloudId) {
    const cloudApi = wx.cloud;
    wx.cloud = null;
    const fallbackUrl = (await api.resolveImageUrls([firstCloudId]))[0];
    wx.cloud = cloudApi;
    check(fallbackUrl.startsWith('/pkg-'), 'Cloud API absence should return a local package URL');
    check(fs.existsSync(path.join(ROOT, ...fallbackUrl.slice(1).split('/'))), 'Cloud fallback URL should exist locally');
  }

  // 图标在云不可用（validate 环境中 cloudReady=false）时必须直接回退本地图标分包。
  maps.forEach(map => {
    api.getRoutesByMapId(map.id).filter(route => route.entryMode === 'fileIcons').forEach(route => {
      const shape = (route.shapes || [])[0];
      const detail = shape && (route.shapeDetails || {})[shape];
      const file = detail && detail.rootFiles && detail.rootFiles[0];
      if (!shape || !file) return;
      const iconUrl = api.getShapeIconUrl(map.id, route.id, shape, file);
      check(iconUrl.indexOf('/pkg-') === 0, 'Icon URL should fall back to local package when cloud is unavailable: ' + route.id);
      check(fs.existsSync(path.join(ROOT, ...iconUrl.slice(1).split('/'))), 'Icon fallback URL should exist locally: ' + iconUrl);
    });
  });

  const firstMap = maps[0];
  const firstRoute = api.getRoutesByMapId(firstMap.id)[0];
  const firstShape = api.getShapes(firstMap.id, firstRoute.id)[0];
  const firstDetail = api.getShapeDetails(firstMap.id, firstRoute.id, firstShape);
  const firstDoor = firstDetail && firstDetail.doors && firstDetail.doors[0];

  const indexPage = loadPage('pages/index/index.js');
  indexPage.onLoad();
  check(indexPage.data.strategies.length > 0, 'Home page did not render strategies');
  indexPage.setData({ currentMode: firstRoute.id });
  indexPage.onShow();
  check(indexPage.data.currentMode === '', 'Home page should reset currentMode when shown');

  const explorerPage = loadPage('pages/explorer/explorer.js');
  explorerPage.onLoad({
    mapId: firstMap.id,
    author: encodeURIComponent(firstRoute.authorId || ''),
    routeId: firstRoute.id
  });
  check(explorerPage.data.routeId === firstRoute.id, 'Explorer did not select the requested route');
  check(explorerPage.data.shapes.length > 0, 'Explorer did not render route shapes');
  check(explorerPage.data.displayShapes.length === explorerPage.data.shapes.length, 'Explorer displayShapes should equal shapes on load');
  check(loadedPackages.includes(api.getPackageRoot(firstRoute.id)), 'Explorer should preload the selected route package');
  const routePrefetchMap = await api.prefetchRouteImageUrls(firstMap.id, firstRoute.id);
  check(Object.keys(routePrefetchMap).length > 0, 'Route image prefetch should return a fallback map');
  explorerPage.onSearchInput({ detail: { value: firstShape } });
  check(explorerPage.data.displayShapes.length > 0 && explorerPage.data.displayShapes.length <= explorerPage.data.shapes.length, 'Explorer shape search should filter displayShapes');
  explorerPage.clearSearch();
  check(explorerPage.data.displayShapes.length === explorerPage.data.shapes.length, 'Explorer clearSearch should restore all shapes');

  const multiDoorShape = explorerPage.data.shapes.find(item => {
    if (item.shapeId === '__root__') return false;
    const detail = api.getShapeDetails(firstMap.id, firstRoute.id, item.shapeId);
    return detail && ((detail.doors || []).length + ((detail.rootFiles || []).length ? 1 : 0)) > 1;
  });
  if (multiDoorShape) {
    explorerPage.openShape(multiDoorShape);
    check(explorerPage.data.showDoorSheet === true, 'Explorer did not open the entrance sheet');
    check(explorerPage.data.doors.length > 1, 'Explorer entrance sheet did not contain multiple choices');
    explorerPage.closeDoorSheet();
    check(explorerPage.data.showDoorSheet === false, 'Explorer did not close the entrance sheet');
  }

  const routeIds = explorerPage.data.routes.map(route => route.id);
  if (routeIds.length > 1) {
    explorerPage.onRouteChange({ currentTarget: { dataset: { routeid: routeIds[1] } } });
    check(explorerPage.data.routeId === routeIds[1], 'Explorer did not switch route in place');
    check(explorerPage.data.showDoorSheet === false, 'Route switch should close the entrance sheet');
  }

  const authors = api.getAuthorsByMapId(firstMap.id);
  if (authors.length > 1) {
    const secondAuthor = authors[1];
    explorerPage.onAuthorChange({ currentTarget: { dataset: { authorid: secondAuthor.id } } });
    check(explorerPage.data.authorId === secondAuthor.id, 'Explorer did not switch author in place');
    check(explorerPage.data.routes.every(route => route.authorId === secondAuthor.id), 'Explorer mixed routes from different authors');
    const secondRoute = api.getRoutesByMapId(firstMap.id).find(route => route.authorId === secondAuthor.id);
    check(Boolean(secondRoute), 'Second author has no visible route');
    check(api.getRoute(firstMap.id, (secondRoute.legacyIds || [])[0], secondAuthor.id).id === secondRoute.id, 'Second author legacy route did not resolve');

    const secondExplorerPage = loadPage('pages/explorer/explorer.js');
    navigationCalls.length = 0;
    secondExplorerPage.onLoad({ mapId: firstMap.id, author: secondAuthor.id, routeId: secondRoute.id });
    await new Promise(resolve => setImmediate(resolve));
    check(loadedPackages.includes(secondRoute.iconPackageRoot), 'Explorer should preload icon package');
    check(Object.keys(secondExplorerPage._iconUrlMap || {}).length > 0, 'Explorer should prefetch icon urls');
    check(secondExplorerPage.data.shapes.length > 0, 'Second author route did not render shapes');
    secondExplorerPage.openShape(secondExplorerPage.data.shapes[0]);
    check(secondExplorerPage.data.showDoorSheet === true, 'Second author route did not open the icon sheet');
    const iconDoor = secondExplorerPage.data.doors.find(item => item.file);
    check(Boolean(iconDoor && iconDoor.icon), 'Second author icon sheet is missing icon entries');
    const iconIndex = secondExplorerPage.data.doors.indexOf(iconDoor);
    navigationCalls.length = 0;
    secondExplorerPage.onDoorTap({ currentTarget: { dataset: { index: iconIndex } } });
    check(navigationCalls[0] && navigationCalls[0].url.indexOf('routeId=' + encodeURIComponent(secondRoute.id)) >= 0 && navigationCalls[0].url.indexOf('file=' + encodeURIComponent(iconDoor.file)) >= 0, 'Second author icon did not open detail with file param');

    const secondDetailPage = loadPage('pages/detail/detail.js');
    secondDetailPage.onLoad({ mapId: firstMap.id, routeId: secondRoute.id, shapeId: encodeURIComponent(secondExplorerPage.data.shapes[0].shapeId), file: encodeURIComponent(iconDoor.file) });
    await new Promise(resolve => setImmediate(resolve));
    check(secondDetailPage.data.strategy && secondDetailPage.data.strategy.images.length === 1, 'Second author detail did not render a single icon image');
    check(secondDetailPage.data.strategy.author === secondRoute.author, 'Second author detail displayed the wrong author');
  }

  navigationCalls.length = 0;
  check(indexPage.data.strategies.length >= 2, 'Home page did not render the second author');
  indexPage.onStrategyTap({ currentTarget: { dataset: { id: firstMap.id, authorid: firstRoute.authorId } } });
  check(navigationCalls[0] && navigationCalls[0].url.startsWith('/pages/explorer/explorer?'), 'Home card should open explorer');

  navigationCalls.length = 0;
  indexPage.onSelectMode({ currentTarget: { dataset: { mode: firstRoute.id, mapid: firstMap.id, authorid: firstRoute.authorId } } });
  check(navigationCalls[0] && navigationCalls[0].url.indexOf('routeId=' + encodeURIComponent(firstRoute.id)) >= 0, 'Home mode button should open explorer with routeId');
  check(loadedPackages.includes(api.getPackageRoot(firstRoute.id)), 'Home mode button should preload route package');

  const versionPage = loadPage('pages/version/version.js');
  navigationCalls.length = 0;
  versionPage.onLoad({ mapId: firstMap.id, author: encodeURIComponent(firstRoute.authorId || '') });
  check(navigationCalls[0] && navigationCalls[0].method === 'redirectTo' && navigationCalls[0].url.startsWith('/pages/explorer/explorer?'), 'Legacy version page should redirect to explorer');

  const routePage = loadPage('pages/route/route.js');
  navigationCalls.length = 0;
  routePage.onLoad({ mapId: firstMap.id, mode: firstRoute.id });
  check(navigationCalls[0] && navigationCalls[0].url.indexOf('routeId=' + firstRoute.id) >= 0, 'Legacy route page should preserve route id');

  const doorPage = loadPage('pages/door/door.js');
  navigationCalls.length = 0;
  doorPage.onLoad({ mapId: firstMap.id, routeId: firstRoute.id, shapeId: encodeURIComponent(firstShape) });
  check(navigationCalls[0] && navigationCalls[0].url.indexOf('shapeId=' + encodeURIComponent(firstShape)) >= 0, 'Legacy door page should preserve shape id');

  if (firstDoor) {
    const detailPage = loadPage('pages/detail/detail.js');
    detailPage.onLoad({
      mapId: firstMap.id,
      routeId: firstRoute.id,
      shapeId: encodeURIComponent(firstShape),
      door: encodeURIComponent(firstDoor.door)
    });
    await new Promise(resolve => setImmediate(resolve));
    check(detailPage.data.strategy && detailPage.data.strategy.images.length > 0, 'Detail page did not render images');
    check(loadedPackages.includes(api.getPackageRoot(firstRoute.id)), 'Detail page did not load its image package');
    check(detailPage.data.strategy.imageItems.length > 0 && detailPage.data.strategy.imageItems[0].fallback, 'Detail image should have local fallback');
    check(Array.isArray(storage.id5_recent_history_v1) && storage.id5_recent_history_v1[0] && storage.id5_recent_history_v1[0].routeId === firstRoute.id, 'Detail page should save recent view history');
    const recentIndexPage = loadPage('pages/index/index.js');
    recentIndexPage.onLoad();
    check(recentIndexPage.data.recentHistory.length > 0, 'Home page should restore recent view history');
    check(recentIndexPage.data.recentHistoryVisible.length <= 2, 'Home page should collapse recent history to 2 items by default');
    recentIndexPage.openHistorySheet();
    check(recentIndexPage.data.showHistory === true, 'Home page should open history bottom sheet');
    recentIndexPage.closeHistorySheet();
    check(recentIndexPage.data.showHistory === false, 'Home page should close history bottom sheet');
    recentIndexPage.clearRecentHistory();
    check(recentIndexPage.data.recentHistory.length === 0, 'Home page should clear recent view history');
  }

  const rootRoute = api.getRoutesByMapId(firstMap.id).find(route =>
    !(route.shapes || []).length && (route.rootFiles || []).length
  );
  if (rootRoute) {
    const rootExplorerPage = loadPage('pages/explorer/explorer.js');
    navigationCalls.length = 0;
    rootExplorerPage.onLoad({ mapId: firstMap.id, routeId: rootRoute.id });
    check(rootExplorerPage.data.shapes.length === 1 && rootExplorerPage.data.shapes[0].shapeId === '__root__', 'Root image route should expose one explorer item');
    rootExplorerPage.openShape(rootExplorerPage.data.shapes[0]);
    check(navigationCalls[0] && navigationCalls[0].url.indexOf('shapeId=__root__') >= 0, 'Root explorer item should open detail directly');

    const rootDetailPage = loadPage('pages/detail/detail.js');
    rootDetailPage.onLoad({ mapId: firstMap.id, routeId: rootRoute.id, shapeId: '__root__' });
    await new Promise(resolve => setImmediate(resolve));
    check(rootDetailPage.data.strategy && rootDetailPage.data.strategy.images.length > 0, 'Root detail did not render images');
  }

  // 最近历史收起/展开：先写入 4 条历史，确保默认只显示 2 条。
  const seededHistory = [0, 1, 2, 3].map(i => ({
    mapId: firstMap.id,
    mapName: firstMap.displayName,
    routeId: firstRoute.id,
    routeName: firstRoute.name,
    author: firstRoute.author,
    shapeId: firstShape,
    door: firstDoor ? firstDoor.door + i : '',
    file: '',
    ts: 1000 + i
  }));
  wx.setStorageSync('id5_recent_history_v1', seededHistory);
  const collapsedIndexPage = loadPage('pages/index/index.js');
  collapsedIndexPage.onLoad();
  collapsedIndexPage.openHistorySheet();
  check(collapsedIndexPage.data.recentHistoryVisible.length === 2, 'Recent history should default to 2 visible items');
  check(collapsedIndexPage.data.recentExpanded === false, 'Recent history should start collapsed');
  collapsedIndexPage.toggleRecentHistory();
  check(collapsedIndexPage.data.recentHistoryVisible.length === collapsedIndexPage.data.recentHistory.length, 'Toggle should expand recent history');
  collapsedIndexPage.toggleRecentHistory();
  check(collapsedIndexPage.data.recentHistoryVisible.length === 2, 'Second toggle should collapse recent history again');
  collapsedIndexPage.clearRecentHistory();

  const inventoryPage = loadPage('pages/inventory/inventory.js');
  inventoryPage.onLoad();
  check(inventoryPage.data.allItems.length > 0, 'Inventory page did not render entries');
  check(inventoryPage.data.filters.length === 0 && inventoryPage.data.activeFilter === '', 'Anomaly tab should not show difficulty filters');
  inventoryPage.onTabTap({ currentTarget: { dataset: { tab: 'material' } } });
  inventoryPage.onFilterTap({ currentTarget: { dataset: { filter: '稀世' } } });
  check(inventoryPage.data.items.length > 0 && inventoryPage.data.items.every(item => item.quality === '稀世'), 'Inventory quality filter failed');
  inventoryPage.onTabTap({ currentTarget: { dataset: { tab: 'anomaly' } } });

  // 图鉴图标必须本地化，避免依赖 BWIKI 外链与域名白名单。
  api.getInventoryData().concat(api.getChapterData()).forEach(item => {
    check(Boolean(item.icon) && item.icon.indexOf('/images/inventory/') === 0, 'Inventory icon should use a local path: ' + item.id);
    if (item.icon) check(fs.existsSync(path.join(ROOT, ...item.icon.slice(1).split('/'))), 'Missing local inventory icon: ' + item.icon);
  });

  // 反馈草稿图片必须能持久化到 USER_DATA_PATH，且提交成功后清理本地文件。
  const feedbackPage = loadPage('pages/feedback/feedback.js');
  const tempImage = path.join(ROOT, '.tmp', 'feedback-temp.jpg');
  fs.mkdirSync(path.dirname(tempImage), { recursive: true });
  fs.writeFileSync(tempImage, 'mock-image');
  const persisted = feedbackPage.persistImages([tempImage]);
  check(persisted[0] && persisted[0].indexOf(wx.env.USER_DATA_PATH) === 0 && fs.existsSync(persisted[0]), 'Feedback draft image should be persisted to USER_DATA_PATH');
  feedbackPage.setData({ content: '校验草稿', contentLength: 4, images: persisted });
  feedbackPage.saveDraft('校验草稿', persisted);
  check(storage.feedback_draft && storage.feedback_draft.images[0] === persisted[0], 'Feedback draft should save persisted image path');
  feedbackPage.removeImage({ currentTarget: { dataset: { index: 0 } } });
  check(!fs.existsSync(persisted[0]), 'Feedback draft image should be removed from USER_DATA_PATH');

  return { maps: maps.length, routes: routeCount, shapes: shapeCount, images: imageCount };
}

async function main() {
  const appConfig = readJson('app.json');
  validatePackConfig();
  validateCloudConfig();
  validateCloudFunctionPackage();
  validateToolchain();
  validateRegisteredPages(appConfig);
  validateBindings(appConfig);
  validateWxmlStructure(appConfig);
  let totals;
  try {
    totals = await validateDataFlow();
  } finally {
    fs.rmSync(path.join(ROOT, '.tmp'), { recursive: true, force: true });
  }

  if (failures.length) {
    console.error('Validation failed:');
    failures.forEach(message => console.error('- ' + message));
    process.exitCode = 1;
    return;
  }

  console.log('Validation passed: ' + checks + ' checks');
  console.log('Data: ' + totals.maps + ' maps, ' + totals.routes + ' routes, ' + totals.shapes + ' shapes, ' + totals.images + ' images');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

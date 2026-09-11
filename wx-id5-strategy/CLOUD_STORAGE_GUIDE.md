# 云存储对接与新增作者

## 当前读取链路

攻略详情不会直接请求自定义 HTTP 接口。图片读取顺序是：

1. `localMapIndex.js` 提供地图、作者、路线和相对文件名。
2. `data/api.js` 使用 `assetNamespace + 相对文件名` 查询 `cloudAssets.js`。
3. 命中 `cloud://` fileID 后，通过 `wx.cloud.getTempFileURL` 转成临时 HTTPS 地址。
4. 云映射不存在、云能力不可用或解析失败时，回退到 `packageRoot/assets`。

云环境 ID 的唯一配置源是 `config/cloud.js`：`app.js` 从中读取 `envId`（即 `CLOUD_ENV`），`tools/gen-cloud-assets.js`、`tools/verify-cloud.js`、`tools/upload-cloud.js` 共用同一份。修改云环境只改这里，并同步把文件上传到新环境的相同目录。

## 云端目录规则

每条路线使用独立目录：

```text
maps/{mapId}/{authorId}/{routeSlug}/{shape}/{door}/{fileName}
```

当前示例：

```text
maps/e_yun_zhi_nv/zhanshi/hard-full/...
maps/e_yun_zhi_nv/zhanshi/hard-fast/...
maps/e_yun_zhi_nv/lianghapi/v0710/...
maps/e_yun_zhi_nv/lianghapi/v0710/icons/...
```

凉哈皮版已经完成迁移，不再使用 `pkg-v0710` 旧目录。展十版 easy/normal/newbie
仍使用 `pkg-easy` / `pkg-normal` / `pkg-newbie` 旧云目录，新增路线时请使用
`maps/...` 命名空间，不要再扩展这些旧目录。

不再使用 `pkg-hard/...` 作为新资源的云目录，因为不同作者和路线可能存在同名图片。

## 路线素材格式约定

- 路线攻略图统一输出为 `.jpg`：即使源盘文件是 `.png`，`sync-assets.js`
  也会自动查找同名源文件、压缩为 JPEG，并按索引中的 `.jpg` 文件名写入分包。
- 识别图标包 `pkg-lianghapi-icons` 保持 PNG，允许透明背景；图标文件名与攻略图
  文件名只要求“同名不同扩展名”，例如路线图 `北-1门.jpg` 对应图标 `北-1门.png`。
- 不要在索引中给路线攻略图继续登记 `.png` 文件名，否则会导致扩展名与文件头不一致。

## 凉哈皮版识别图标

凉哈皮版采用 `entryMode: "fileIcons"`，每个形状的根图片不再作为“散图”整组展示，而是逐图映射到识别图标：

- `iconPackageRoot`：图标本地兜底分包，例如 `pkg-lianghapi-icons`。
- `iconNamespace`：图标云目录，例如 `maps/e_yun_zhi_nv/lianghapi/v0710/icons`。
- 图标文件名与对应攻略图文件名保持一致，目录按 `北 / 南 / 左 / 右` 分组。
- 查询页弹出图标入口列表，点击后详情页使用 `file` 参数只展示对应单张攻略图。

## 新增作者

1. 整理作者原始图片，确认每个形状、入口和文件名。
2. 在 `data/localMapIndex.js` 的地图 `authors` 中添加 `{ id, name }`。
3. 添加路线，确保 `id`、`authorId`、`difficulty`、`packageRoot`、`assetNamespace` 唯一且完整；如需逐图图标，再填写 `entryMode`、`iconPackageRoot` 和 `iconNamespace`。
4. 为旧链接迁移时填写 `legacyIds`；全新路线使用空数组。
5. 运行 `node tools/sync-assets.js`，生成压缩后的本地兜底分包。
6. 给新分包添加 `pages/redirect/redirect` 四个入口文件，并在 `app.json` 注册。
7. 将 `packageRoot/assets` 下的图片上传到对应 `assetNamespace`，保持相对目录不变。
8. 全部上传完成后运行 `node tools/gen-cloud-assets.js`。
9. 运行 `node tools/validate-project.js`，然后在开发者工具和真机检查。

视频不属于此流程，`sync-assets.js` 不处理视频。

## 命令行上传（推荐）

素材更新后可用 `tools/upload-cloud.js` 把本地分包同步到对应云目录，免去逐张手传：

```powershell
node tools/upload-cloud.js --route zhanshi-nightmare,zhanshi-nightmare-full              # dry-run，先看计划
node tools/upload-cloud.js --route zhanshi-nightmare,zhanshi-nightmare-full --apply --prune --gen
```

- 默认 dry-run；`--apply` 才真正上传，`--prune` 删除云端「本地已不存在」的文件（图片改名/删除后必用），`--gen` 在全部上传成功后自动生成 `cloudAssets.js`。
- 依赖 tcb 登录态（`tcb login`，或 `tcb login --apiKeyId <SecretId> --apiKey <SecretKey>`）。未登录时只打印计划并提示，不会误删。
- 云路径由索引推导：`legacyCloudPackage/assets/...`（旧布局）或 `assetNamespace/...`（新布局）。
- 注意 `tcb storage list` 是字符串前缀匹配，`nightmare` 会连带匹配 `nightmare-full`，脚本内已按目录边界过滤。

## 过渡期兼容文件（改名/删图必读）

云存储是**所有已发布版本共用的一份**，而旧版本客户端把 `cloudAssets.js` 打包在自己身上，
只会按当时的文件名请求图片。所以素材一旦改名或删除，**旧版本就会 404**（页面显示「图片加载失败」，
本地分包兜底同样取不到，因为新旧索引下这些文件都已从分包剔除）。

规则：**改名/删图后不要在同一次操作里 `--prune`**。正确顺序是

```text
上传新素材 → 发布新版本 → 等旧版本基本退出 → 再清理旧文件
```

过渡期把被淘汰的文件登记到该路由的 `compatCloudFiles`：

```js
"compatCloudFiles": [
  "┗/上路.jpg",
  "左右路/左右路   右s.jpg"
]
```

- 路径相对 `assetNamespace`（使用 `legacyCloudPackage` 的路线则相对 `{pkg}/assets`）。
- `verify-cloud.js` 把它们算进期望文件，因此过渡期仍能 `CLOUD_OK`；云端真缺了会报 `缺失`。
- `upload-cloud.js --prune` 不会删除它们，并在云端缺失时告警。
- 新版本全量上线、旧版本退出后，从清单移除再 `--prune` 清理。
- 漏删要回补时：`git show <旧提交>:<packageRoot>/assets/<相对路径>` 取出原字节重传，
  保证与旧版本分包里那份逐字节一致（临时链接可能被缓存 90 分钟，让用户重进小程序最稳）。

## 微信开发者工具上传方法

1. 打开“云开发”，选择与 `CLOUD_ENV` 一致的环境。
2. 进入“存储”，按路线创建 `maps/...` 目录。
3. 上传该路线 `packageRoot/assets` 中的内容，保留形状和入口子目录。
4. 随机打开数个文件，确认云端完整路径和 `assetNamespace` 一致。
5. 只有全部文件上传成功后才重新生成 `cloudAssets.js`。

`tools/gen-cloud-assets.js` 不会上传或验证云文件。它根据本地文件和固定云环境前缀生成 fileID，因此提前运行会产生看似正确、实际不存在的映射。

## 发布前检查

```powershell
node tools/validate-project.js
```

随后至少验证：

- 首页能看到所有作者。
- 查询页切换作者后不会混入其他作者路线。
- 每条路线都能加载正确图片。
- 旧分享链接仍能打开，并在再次分享时输出新路线 ID。
- 关闭云能力后，本地分包仍能显示图片。

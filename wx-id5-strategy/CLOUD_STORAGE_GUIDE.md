# 云存储对接与新增作者

## 当前读取链路

攻略详情不会直接请求自定义 HTTP 接口。图片读取顺序是：

1. `localMapIndex.js` 提供地图、作者、路线和相对文件名。
2. `data/api.js` 使用 `assetNamespace + 相对文件名` 查询 `cloudAssets.js`。
3. 命中 `cloud://` fileID 后，通过 `wx.cloud.getTempFileURL` 转成临时 HTTPS 地址。
4. 云映射不存在、云能力不可用或解析失败时，回退到 `packageRoot/assets`。

`app.js` 中的 `CLOUD_ENV` 必须与微信云开发控制台中的环境 ID 一致。

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

不再使用 `pkg-hard/...` 作为新资源的云目录，因为不同作者和路线可能存在同名图片。

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
5. 运行 `./tools/sync-assets.ps1`，生成压缩后的本地兜底分包。
6. 给新分包添加 `pages/redirect/redirect` 四个入口文件，并在 `app.json` 注册。
7. 将 `packageRoot/assets` 下的图片上传到对应 `assetNamespace`，保持相对目录不变。
8. 全部上传完成后运行 `node tools/gen-cloud-assets.js`。
9. 运行 `node tools/validate-project.js`，然后在开发者工具和真机检查。

视频不属于此流程，不传 `sync-assets.ps1` 的 `-IncludeVideo` 参数。

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

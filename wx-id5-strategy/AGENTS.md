# AGENTS.md — 项目协作指南

> 本文件供 AI 助手（opencode 等）在新会话中快速恢复上下文。修改项目结构或流程后请同步更新。

## 项目是什么

微信小程序「加页手记攻略」：《第五人格》加页手记玩法查询工具。
核心链路：`首页 → pages/explorer（作者/难度/形状/侧门单页选择）→ pages/detail（攻略图）`。

## 架构关键点

- `data/localMapIndex.js`：唯一数据源（SSOT）。地图/路线/形状/侧门/图鉴全在这里，手工维护。
- `data/api.js`：页面唯一读取接口。图片解析顺序：云 fileID → 本地分包回退。
- `data/cloudAssets.js`：**生成文件**（勿手改），由 `tools/gen-cloud-assets.js` 产出。
- `data/imageMeta.js`：**生成文件**，由 `tools/sync-assets.js` 产出（图片宽高，详情页稳定占位）。
- 分包：`pkg-{作者}-{内容}/assets/` 按作者拆分；每个分包只有 redirect 占位页；app.json 需注册。
- 云存储布局：`maps/e_yun_zhi_nv/{authorId}/{routeSlug}/...`；凉哈皮图标在 `pkg-v0710/icon/`。
- 云环境：`config/cloud.js` 是唯一配置源（envId + storagePrefix）。
- 路线图统一 JPEG 输出、索引扩展名归一 `.jpg`；图标包保留 PNG 透明度。

## 工具链（全部在项目根目录运行）

```powershell
node tools/sync-assets.js            # 索引 -> 本地分包 + imageMeta（素材同步必跑）
node tools/gen-cloud-assets.js       # 索引 -> cloudAssets.js（云上传完成后才可跑）
node tools/validate-project.js       # 完整性校验（发布前必须零失败）
node tools/smoke-test.js             # 全功能冒烟测试
node tools/release-check.js          # 发布总检（含云端一致性）
node tools/scrape-inventory.js [--download]   # BWIKI 图鉴抓取（自动压缩图标）
node tools/compress-inventory-icons.js --all  # 图标压缩（最长边180px+调色板PNG）
```

## 常见任务 SOP

### 图鉴更新（BWIKI 有新内容）
1. `node tools/scrape-inventory.js --download`（抓取+对比+下载图标+自动压缩）
2. 审核 `tools/scrape-report.json` → append-only 合并进 localMapIndex
3. validate 零失败 → 提交

### 新增/更新路线（新攻略素材）
1. 素材放 F:\d5 对应目录 → localMapIndex 加 route（id/packageRoot/assetNamespace 唯一）
2. `sync-assets.js` → app.json 注册分包 + redirect 四件套 → 图片上传云存储 → `gen-cloud-assets.js`
3. 新难度记得同步：explorer.js 与 index.js 的 `DIFF_RANK`、detail.js 的 `TAG_CLASS`

### 云函数部署
```powershell
tcb fn deploy adminApi --force   # 已配置 cloudbaserc.json，云端装依赖，勿本地打包 node_modules
```

## 环境注意事项

- **PowerShell 中文输出**：命令前加 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`；复杂逻辑写临时 .js/.ps1 到 `$env:TEMP` 执行，避免内联转义地狱。
- **git 推送**走本地代理 `127.0.0.1:7897`，代理客户端未开时会连接失败——重试或提示用户开代理。
- **tcb CLI**（@cloudbase/cli）已登录，可直接操作云开发（storage upload/rm、fn deploy/invoke、db）。
- 主包体积纪律：图鉴图标必须压缩后入包；攻略大图只进分包与云存储；当前主包 ~0.9MB / 上限 2MB。

## 协作约定

- 用户中文交流；提交信息用中文，格式 `feat:/fix:/perf:/docs:/chore: 描述`。
- 动刀前先备份：`git push` + 打注解 tag（如 `pre-xxx-backup`）。
- 数据文件合并用"锚点定位 + 块替换"脚本化操作，禁止整文件重生成（会丢注释）。
- 长任务每完成一个里程碑就提交，作为中断恢复点。

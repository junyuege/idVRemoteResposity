# -*- coding: utf-8 -*-
"""生成《加页手记攻略》项目分析 PDF。运行: python docs/build_pdf.py"""
import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, KeepTogether,
                                Preformatted, HRFlowable, NextPageTemplate)

FONT = r'C:\Windows\Fonts\msyh.ttc'
FONT_BOLD = r'C:\Windows\Fonts\msyhbd.ttc'
pdfmetrics.registerFont(TTFont('YH', FONT))
pdfmetrics.registerFont(TTFont('YHB', FONT_BOLD))

OUT = os.path.join(os.path.dirname(__file__), '加页手记攻略-项目分析与学习指南.pdf')

# 颜色
C_BG = colors.HexColor('#17181c')
C_PANEL = colors.HexColor('#22242a')
C_GOLD = colors.HexColor('#d89b3c')
C_TEXT = colors.HexColor('#f3f1ed')
C_SUB = colors.HexColor('#92949c')
C_LINE = colors.HexColor('#3a3c45')
C_ROW1 = colors.HexColor('#f4f1ea')
C_ROW2 = colors.HexColor('#ffffff')

def st(name, **kw):
    base = dict(fontName='YH', fontSize=10, leading=15.5, textColor=colors.HexColor('#26282e'))
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    'cover_kicker': st('cover_kicker', fontName='YHB', fontSize=11, leading=14, textColor=C_GOLD, alignment=TA_CENTER),
    'cover_title': st('cover_title', fontName='YHB', fontSize=26, leading=34, textColor=C_TEXT, alignment=TA_CENTER),
    'cover_sub': st('cover_sub', fontName='YH', fontSize=13, leading=20, textColor=C_SUB, alignment=TA_CENTER),
    'h1': st('h1', fontName='YHB', fontSize=15, leading=20, textColor=C_TEXT),
    'h2': st('h2', fontName='YHB', fontSize=12.5, leading=17, textColor=C_GOLD, spaceBefore=6),
    'body': st('body', wordWrap='CJK'),
    'small': st('small', fontSize=8.5, leading=13, textColor=C_SUB, wordWrap='CJK'),
    'bullet': st('bullet', wordWrap='CJK', leftIndent=10, bulletIndent=1, spaceBefore=2, spaceAfter=2),
    'code': st('code', fontName='Courier', fontSize=8, leading=11.5, textColor=colors.HexColor('#e7e2d7'), backColor=C_BG, borderPadding=6, wordWrap='CJK'),
    'cell': st('cell', fontSize=8.8, leading=13, wordWrap='CJK'),
    'cell_bold': st('cell_bold', fontName='YHB', fontSize=8.8, leading=13, wordWrap='CJK'),
    'cell_head': st('cell_head', fontName='YHB', fontSize=9, leading=13, textColor=colors.white, wordWrap='CJK'),
    'toc': st('toc', fontSize=10.5, leading=20, wordWrap='CJK'),
}

def P(text, style='body'):
    return Paragraph(text, S[style])

def B(text, style='bullet'):
    return Paragraph(text, S[style], bulletText='•')

def H1(text):
    t = Table([[Paragraph(text, S['h1'])]], colWidths=[176*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
        ('LINEBEFORE', (0,0), (0,-1), 3, C_GOLD),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return [Spacer(1, 8), t, Spacer(1, 7)]

def H2(text):
    return Paragraph(text, S['h2'])

def CODE(text):
    escaped = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return Preformatted(escaped, S['code'])

def KV(rows, widths=(42*mm, 134*mm)):
    data = [[Paragraph(k, S['cell_bold']), Paragraph(v, S['cell'])] for k, v in rows]
    t = Table(data, colWidths=widths, repeatRows=0)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.4, C_LINE),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f6f3ec')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return t

def TBL(headers, rows, widths=None, fontsize=8.6):
    data = [[Paragraph(h, S['cell_head']) for h in headers]]
    for r in rows:
        data.append([Paragraph(c, S['cell']) for c in r])
    if not widths:
        widths = [176*mm/len(headers)]*len(headers)
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0,0), (-1,0), C_BG),
        ('GRID', (0,0), (-1,-1), 0.4, C_LINE),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0,i), (-1,i), C_ROW1))
    t.setStyle(TableStyle(style))
    return t

def callout(title, text):
    t = Table([[Paragraph(title, S['cell_bold']), Paragraph(text, S['cell'])]], colWidths=[30*mm, 146*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fbf6eb')),
        ('BOX', (0,0), (-1,-1), 0.8, C_GOLD),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    return t

story = []

# ============ 封面 ============
story.append(Spacer(1, 52*mm))
story.append(Paragraph('IDENTITY V · 加页手记', S['cover_kicker']))
story.append(Spacer(1, 8*mm))
story.append(Paragraph('《加页手记攻略》微信小程序', S['cover_title']))
story.append(Spacer(1, 4*mm))
story.append(Paragraph('项目分析 · 功能清单 · 最简学习路径', S['cover_title']))
story.append(Spacer(1, 10*mm))
story.append(Paragraph('一份用于快速读懂项目结构、功能边界与上手顺序的学习文档', S['cover_sub']))
story.append(Spacer(1, 34*mm))
cover_rows = [
    ['项目名称', '加页手记攻略（第五人格玩家查询工具）'],
    ['项目形态', '原生微信小程序 + 微信云开发 + Node.js 工具链'],
    ['数据规模', '1 张地图 · 6 条攻略路线 · 40 个路线形状 · 123 张攻略图'],
    ['图鉴规模', '24 条异象/道具图鉴 + 30 条辞章条目'],
    ['质量基线', 'node tools/validate-project.js 通过 1119 项检查'],
]
story.append(Table([[Paragraph(k, S['cell_bold']), Paragraph(v, S['cell'])] for k, v in cover_rows], colWidths=[34*mm, 110*mm], style=[
    ('BACKGROUND', (0,0), (0,-1), C_PANEL),
    ('BACKGROUND', (1,0), (1,-1), C_PANEL),
    ('TEXTCOLOR', (0,0), (0,-1), C_GOLD),
    ('TEXTCOLOR', (1,0), (1,-1), C_TEXT),
    ('GRID', (0,0), (-1,-1), 0.4, C_LINE),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(PageBreak())

# ============ 目录 ============
story += H1('目录')
toc_items = [
    '1. 项目概览：这是什么项目',
    '2. 目录结构与职责',
    '3. 分析思考：架构设计与关键机制',
    '4. 功能清单：逐模块说明',
    '5. 最简学习路径：从零到能维护',
    '6. 核心代码阅读顺序',
    '7. 发布与维护检查表',
    '8. 总结与改进建议',
    '9. 本轮改造记录',
]
for it in toc_items:
    story.append(Paragraph(it, S['toc']))
story.append(Spacer(1, 4))
story.append(callout('使用建议', '第一次阅读可按第 5 节“最简学习路径”的顺序，边读边打开对应文件；熟悉后把第 7 节检查表作为日常维护基线。'))
story.append(PageBreak())

# ============ 1 项目概览 ============
story += H1('1. 项目概览：这是什么项目')
story.append(P('本项目是一个面向《第五人格》玩家自制的微信小程序查询工具，主题为“加页手记”玩法。它解决的核心问题是：在对局准备、路线复盘时，用尽量少的点击找到对应攻略图。'))
story.append(H2('1.1 核心使用链路'))
story.append(CODE('首页地图/作者  →  路线查询（版本/形状/入口）  →  攻略图片\n辅助能力：异象、道具、辞章图鉴 · 小抄教学 · 意见反馈 · 项目说明'))
story.append(H2('1.2 技术栈'))
story.append(TBL(
    ['层次', '技术选型', '用途'],
    [
        ['客户端', '原生微信小程序（WXML / WXSS / JS）', '页面交互、列表与详情、图片预览、分享'],
        ['数据层', 'data/localMapIndex.js + data/api.js', '单一数据源（SSOT）与统一数据读取接口'],
        ['云端', '微信云开发（云存储 / 云函数 / 云数据库）', '攻略图片临时链接、反馈图片上传、反馈入库'],
        ['资源策略', '分包加载 + 本地兜底分包 + cloud:// 映射', '弱网可用、控制主包体积、云资源失败自动回退'],
        ['工程工具', 'Node.js + PowerShell 脚本', '素材同步压缩、云映射生成、1119 项完整性校验'],
    ],
    widths=(24*mm, 64*mm, 88*mm),
))
story.append(H2('1.3 关键规模数据'))
story.append(TBL(
    ['统计项', '数值', '说明'],
    [
        ['注册主包页面', '11 个', '首页、我的、路线查询、详情、图鉴、反馈、教程、关于等'],
        ['注册分包', '7 个', '5 个展十版资源包 + 凉哈皮资源包 + 凉哈皮图标包'],
        ['攻略路线', '6 条', '展十版 5 条（新手/简单/普通/困难全棺/困难速刷）+ 凉哈皮 1 条'],
        ['路线形状', '40 个', '含“┏ ┗ ┣ ┳ 北 南 左 右”等形状分组'],
        ['攻略图片', '123 张', '按 shape/door/file 三级索引，由验证脚本统计'],
        ['云映射条目', '151 条', '123 张攻略图 + 28 张凉哈皮识别图标'],
        ['图鉴条目', '54 条', 'inventoryData 24 条 + chapterData 30 条'],
        ['完整性校验', '1119 项', 'node tools/validate-project.js 全部通过'],
    ],
    widths=(30*mm, 24*mm, 122*mm),
))
story.append(PageBreak())

# ============ 2 目录结构 ============
story += H1('2. 目录结构与职责')
story.append(P('目录可以分成四层：全局配置 → 数据/API 层 → 页面层 → 资源/工具层。先看全局，再看数据，最后看页面。'))
story.append(TBL(
    ['路径', '职责与说明'],
    [
        ['app.js / app.json / app.wxss', '应用入口、页面/分包/TabBar 注册、全局样式；app.js 初始化云开发环境。'],
        ['data/localMapIndex.js', '核心：单一数据源。地图、作者、路线、形状、侧门、图片文件、图鉴/辞章条目都在此。'],
        ['data/api.js', '唯一数据读取器。提供 getRoute、getShapes、buildImageUrl、resolveImageUrls 等接口。'],
        ['data/cloudAssets.js', '自动生成的 cloud:// fileID 映射，由 tools/gen-cloud-assets.js 产出。'],
        ['pages/index', '首页：按“地图 × 作者”生成攻略卡片，提供难度快捷入口。'],
        ['pages/explorer', '核心查询页：单页内完成作者、版本、形状、侧门/识别图选择。'],
        ['pages/detail', '攻略详情页：加载图片、失败重试、全屏预览、分享稳定链接。'],
        ['pages/inventory', '资料图鉴：异象 / 道具 / 辞章三分类，支持搜索与详情弹层。'],
        ['pages/tutorial / feedback / mine / about', '教学图、意见反馈（云函数入库）、我的、关于。'],
        ['pages/version / route / door', '兼容旧分享链接，redirectTo 到新的 explorer 查询页。'],
        ['pkg-zhanshi-*', '展十版按路线拆分的图片分包，共 5 个，每个含 assets 与 redirect 占位页。'],
        ['pkg-lianghapi-v0710', '凉哈皮 7.10 新版路线图片分包（28 张）。'],
        ['pkg-lianghapi-icons', '凉哈皮识别图标分包（28 张），与路线图文件名一一对应。'],
        ['pkg-hard / pkg-normal / pkg-easy / pkg-newbie / pkg-v0710', '历史遗留分包，已从 app.json 注册和打包排除；保留供迁移期参考。'],
        ['cloudfunctions/addFeedback', '云函数：校验反馈内容并写入 feedback 集合，自动记录 OPENID 与创建时间。'],
        ['tools/validate-project.js', '项目体检脚本：注册、绑定、WXML 结构、数据流、页面模拟共 1119 项检查。'],
        ['tools/gen-cloud-assets.js', '按本地索引与固定云前缀生成 data/cloudAssets.js（只生成映射，不上传文件）。'],
        ['tools/sync-assets.ps1', '从本地源盘按索引扫描素材，压缩并按分包预算写入 pkg-*/assets。'],
        ['tools/import-report.json', '最近一次素材同步的分包数量、体积、缺失/多余文件报告。'],
        ['images / style / utils', 'Tab 图标、占位图、教学图与全局样式目录；工具函数（当前使用较少）。'],
        ['PROJECT_PLAN.md / CLOUD_STORAGE_GUIDE.md', '项目规划与云存储对接说明，是理解和维护的首选文档。'],
    ],
    widths=(54*mm, 122*mm),
))
story.append(PageBreak())

# ============ 3 分析思考 ============
story += H1('3. 分析思考：架构设计与关键机制')
story.append(H2('3.1 为什么这样设计：单一数据源（SSOT）'))
story.append(P('所有页面的地图、作者、难度、形状、入口、图片文件名都只维护在 data/localMapIndex.js。页面代码不写死业务数据，而是调用 data/api.js。好处是新增作者或路线时，只需扩展索引和素材，不需要复制页面逻辑；坏处是对索引结构要求高，必须靠工具脚本兜底校验。'))
story.append(CODE('localMapIndex.js（唯一事实）\n        │\n        ▼\ndata/api.js（唯一读取接口）\n        │\n        ├── pages/index（首页卡片）\n        ├── pages/explorer（版本/形状/入口）\n        ├── pages/detail（图片展示）\n        └── pages/inventory（图鉴）'))
story.append(H2('3.2 云存储与本地分包的“双通道”资源策略'))
story.append(B('读取顺序：先用 assetNamespace + 相对路径查 cloudAssets.js 拿到 cloud:// fileID，再通过 wx.cloud.getTempFileURL 换临时 HTTPS 地址。'))
story.append(B('兜底回退：云映射不存在、wx.cloud 不可用、单条解析失败、整体请求失败时，回退到本地分包绝对路径 /pkg-*/assets/...。'))
story.append(B('性能与弱网：临时链接缓存 90 分钟（约短于 2 小时有效期）；详情页先 loadSubpackage，再批量解析图片链接，任一来源失败都不阻塞页面。'))
story.append(B('新增资源必须双写：本地分包生成一次、云端上传一次，并由 gen-cloud-assets.js 生成映射，三者一致才算完成。'))
story.append(H2('3.3 分包策略'))
story.append(B('每个攻略版本一个独立分包，如 pkg-zhanshi-hard-full、pkg-lianghapi-v0710，避免一次性下载所有攻略图。'))
story.append(B('每个分包只注册一个 pages/redirect/redirect 占位页；真正下载由 detail 页的 wx.loadSubpackage 按需触发。'))
story.append(B('主包 pages/explorer 用绝对路径引用分包图片，避免相对路径在页面层级变化时失效。'))
story.append(B('每个分包预算约 1.85MB，由 tools/sync-assets.ps1 自动按 1280/1024/800/640px 与质量 70/60/50 组合寻找最接近预算的压缩档。'))
story.append(H2('3.4 多作者与旧链接兼容'))
story.append(B('每个路线有稳定 id，旧链接通过 legacyIds 识别（如 zhanshi-hard-full 兼容旧 id “hard”）。'))
story.append(B('旧页面 pages/version、pages/route、pages/door 只做 redirectTo 到 explorer，保留分享链接可用性。'))
story.append(B('详情页再次分享时统一输出新 id，避免旧 id 继续扩散。'))
story.append(B('云目录按 maps/{mapId}/{authorId}/{routeSlug} 隔离，旧 pkg-hard 目录不复用，防止不同作者同名文件串版。'))
story.append(H2('3.5 凉哈皮“逐图图标”模式'))
story.append(P('凉哈皮版使用 entryMode: "fileIcons"。形状下没有“侧门”概念，而是每个识别图标对应一张攻略图：'))
story.append(CODE('route.entryMode = "fileIcons"\niconPackageRoot = "pkg-lianghapi-icons"\niconNamespace = "pkg-v0710/icon"\n图标文件名 == 对应攻略图文件名\n查询页：显示图标列表 → 点击后带 file 参数进入详情 → 只展示单张'))
story.append(H2('3.6 工程化校验'))
story.append(P('tools/validate-project.js 不是简单 lint，而是一个“可执行的发布前验收”：它会注册每个页面、模拟 wx API、跑首页/查询页/详情页/图鉴页流程、检查每条索引图片是否存在本地兜底文件、检查 cloud:// 映射、检查旧 id 解析、检查作者切换是否串数据。目前 1119 项检查全部通过。'))
story.append(H2('3.7 值得注意的现状与风险'))
story.append(TBL(
    ['观察点', '现状 / 风险', '建议'],
    [
        ['云环境 ID 写死', 'app.js 中 CLOUD_ENV 为固定字符串', '发布多套环境时可改为按环境配置注入'],
        ['云映射不做在线验证', 'gen-cloud-assets.js 只按本地文件生成 fileID', '保持“先上传云端，再生成映射”的流程纪律'],
        ['图鉴图标外链', 'inventoryData 图标指向 BWIKI 外链', '弱网下已回退本地占位图；必要时可代理或本地化'],
        ['源素材路径绑定本机', 'sourceAnchor 为 F:/d5/... 绝对路径', '团队协作时统一源盘目录，或把素材源纳入版本化规则'],
        ['历史分包保留', 'pkg-hard 等目录未注册且打包排除', '确认无引用后清理，或归档到仓库外'],
        ['新增作者手工步骤多', '需改索引 + 同步素材 + 注册分包 + 传云 + 生成映射', '按 PROJECT_PLAN.md 的 7 步流程操作'],
    ],
    widths=(34*mm, 82*mm, 60*mm),
))
story.append(PageBreak())

# ============ 4 功能清单 ============
story += H1('4. 功能清单：逐模块说明')
story.append(TBL(
    ['模块 / 页面', '关键文件', '已实现功能'],
    [
        ['首页', 'pages/index', '按“地图 × 作者”生成攻略卡片；展示各难度并可直接跳转；短标签与长标签分两行排布；下拉刷新；分享小程序；入口到教学与图鉴。'],
        ['路线查询（核心）', 'pages/explorer', '作者切换、版本横向滚动切换、形状卡片（含入口数与图片数）、侧门底部弹层、单入口自动直达、凉哈皮识别图标列表、长按图标放大预览、当前路线分享。'],
        ['攻略详情', 'pages/detail', '解析 mapId/routeId/shapeId/door/file 参数；兼容 legacyIds；预加载分包；云端临时链接 + 本地兜底；图片失败标记与点击重试；全屏预览与长按保存；生成可读摘要；分享输出新稳定 id。'],
        ['资料图鉴', 'pages/inventory', '异象/道具/辞章三类 Tab；关键词搜索；品质映射（独特蓝/奇珍紫/稀世金/华彩红）；强化异象红框；点击底部抽屉展示刷新地图、应对方式、价格、重量、耐久等详情；图片失败回退占位图。'],
        ['小抄教学', 'pages/tutorial', '展示教学图片；点击全屏预览；支持分享教学页。'],
        ['意见反馈', 'pages/feedback', '文字最多 500 字；截图最多 8 张；图片上传云存储；调用 addFeedback 云函数入库；失败或云不可用时本地草稿暂存并在下次进入恢复；提交中禁用重复提交。'],
        ['我的', 'pages/mine', '版本号展示；入口到教学/反馈/关于；分享小程序；数据来源说明。'],
        ['关于项目', 'pages/about', '项目说明、内容来源、免责声明、版本展示。'],
        ['旧链接兼容', 'pages/version、pages/route、pages/door', '旧版参数重定向到新 explorer，保证历史分享链接仍可打开。'],
        ['分包占位页', 'pkg-*/pages/redirect', '使各资源包满足分包注册要求，资源包可按需被 wx.loadSubpackage 下载。'],
        ['数据/API 层', 'data/api.js', 'getMaps / getRoute / getShapes / getShapeDetails / buildImageUrl / getImagesForShape / resolveImageUrls / loadRoutePackage 等统一接口；图片临时链接缓存 90 分钟。'],
        ['云函数', 'cloudfunctions/addFeedback', '校验非空内容，截断 500 字，限制 8 张图，写入 feedback 集合，返回统一 code/data/message。'],
        ['工具链', 'tools/*', 'validate-project.js 做 1119 项发布前检查；gen-cloud-assets.js 生成云映射；sync-assets.ps1 压缩同步素材并控制分包体积。'],
    ],
    widths=(30*mm, 40*mm, 106*mm),
))
story.append(Spacer(1, 6))
story.append(callout('功能边界说明', '本项目是查询/展示型工具，不包含用户登录、内容发布、评论、后台管理；路线数据通过索引文件维护，反馈数据通过云函数入库后需在云开发控制台查看。'))
story.append(PageBreak())

# ============ 5 学习路径 ============
story += H1('5. 最简学习路径：从零到能维护')
story.append(P('下面按“先宏观、再数据、再核心链路、最后工具链”的顺序推进。每个阶段都给出具体文件与验收标准。'))
story.append(TBL(
    ['阶段', '目标', '学习动作', '重点文件', '验收标准'],
    [
        ['0. 环境准备（约10分钟）', '能打开并校验项目', '用微信开发者工具打开项目；终端运行 node tools/validate-project.js；通读 PROJECT_PLAN.md。', 'project.config.json、app.json、PROJECT_PLAN.md、tools/validate-project.js', '校验输出 Validation passed: 1119 checks；知道主包 11 页、7 个分包。'],
        ['1. 读数据（约30分钟）', '理解 SSOT 结构', '从 maps 数组开始读；找出 6 条 route 的 id/legacyIds/packageRoot/assetNamespace/shapes/shapeDetails；对照 api.js 的字段用途。', 'data/localMapIndex.js、data/api.js', '能画出“地图→作者→路线→形状→门→文件”的层级图；能说清一条路线图片如何拼出路径。'],
        ['2. 走核心链路（约40分钟）', '理解查询交互', '按“首页点击难度 → explorer 选形状/入口 → detail 显示图片”的顺序阅读；关注参数如何层层传递。', 'pages/index/index.js、pages/explorer/explorer.js、pages/detail/detail.js（配合 .wxml）', '能口述一次点击从 onSelectMode 到 wx.previewImage 的完整调用链；知道 __root__、fileIcons 两个特殊分支。'],
        ['3. 读资源链路（约30分钟）', '理解云端/本地双通道', '读 api.cloudUrl、resolveImageUrls、getLocalFallback、loadRoutePackage；读 gen-cloud-assets.js 看映射如何生成。', 'data/api.js、data/cloudAssets.js、tools/gen-cloud-assets.js、CLOUD_STORAGE_GUIDE.md', '能解释：cloud:// fileID → HTTPS 临时链接；失败时如何回退到 /pkg-*/assets。'],
        ['4. 读辅助功能（约30分钟）', '覆盖非核心页面', '读图鉴分类与搜索、反馈草稿与云函数、旧页面重定向。', 'pages/inventory/inventory.js、pages/feedback/feedback.js、cloudfunctions/addFeedback/index.js、pages/version/route/door', '能说出图鉴三个 Tab 的数据来源；知道反馈失败时本地草稿如何恢复。'],
        ['5. 读维护工具（约40分钟）', '能安全新增内容', '通读 validate-project.js 的检查分类；按 CLOUD_STORAGE_GUIDE.md 新增作者流程走一遍（可只做 DryRun）。', 'tools/validate-project.js、tools/sync-assets.ps1、tools/gen-cloud-assets.js', '能按 7 步新增一条路线而不破坏 1119 项检查；理解“先传云、再生成映射”。'],
    ],
    widths=(28*mm, 24*mm, 60*mm, 40*mm, 24*mm),
    fontsize=8.2,
))
story.append(Spacer(1, 6))
story.append(callout('最少投入路径', '如果时间非常有限，只做三件事：① 读 app.json 与 data/localMapIndex.js；② 读 pages/index → pages/explorer → pages/detail；③ 运行 tools/validate-project.js。这三步足以覆盖本项目 80% 的日常理解需求。'))
story.append(PageBreak())

# ============ 6 核心代码阅读顺序 ============
story += H1('6. 核心代码阅读顺序')
story.append(H2('6.1 推荐顺序（每步约 10–20 分钟）'))
story.append(TBL(
    ['序号', '文件', '阅读重点'],
    [
        ['1', 'app.json', '页面注册、7 个分包、TabBar；理解什么是主包与分包。'],
        ['2', 'PROJECT_PLAN.md', '产品定位、核心路径、体验原则、多作者约定、发布检查表。'],
        ['3', 'data/localMapIndex.js', '只看结构：maps[0].authors 与 maps[0].routes；任选一条 route 读 shapeDetails。'],
        ['4', 'data/api.js', '函数清单：getRoute、getShapes、getShapeDetails、buildImageUrl、resolveImageUrls、getPackageRoot。'],
        ['5', 'pages/index/index.js', '如何把 maps+routes 转换成首页卡片；onSelectMode 如何跳转。'],
        ['6', 'pages/explorer/explorer.js', 'loadExplorer → selectRoute → openShape → onDoorTap → goToDetail 的主线。'],
        ['7', 'pages/detail/detail.js', 'onLoad 参数解析、图片来源选择、render 与失败重试、分享参数。'],
        ['8', 'data/cloudAssets.js', '认识生成文件格式；与 api.getCloudAsset 的对应关系。'],
        ['9', 'tools/validate-project.js', '看 6 类检查：注册、配置、绑定、WXML、数据流、页面模拟。'],
        ['10', 'tools/gen-cloud-assets.js + sync-assets.ps1', '理解“索引 → 素材 → 映射”的生成链路。'],
        ['11', 'cloudfunctions/addFeedback/index.js', '云函数入参与返回规范，云数据库写入方式。'],
        ['12', 'pages/inventory/index.js + feedback.js', '辅助页面的数据加工与容错处理。'],
    ],
    widths=(14*mm, 70*mm, 92*mm),
))
story.append(H2('6.2 一条主线调用链（背诵版）'))
story.append(CODE('index.onSelectMode\n  └─ navigateTo explorer?mapId=&author=&routeId=\nexplorer.loadExplorer\n  ├─ api.getAuthorsByMapId / getRoutesByMapId\n  └─ selectRoute → openShape → onDoorTap\ndetail.onLoad\n  ├─ api.getRoute（支持 legacyIds）\n  ├─ api.getImagesForShape / getShapeRootImageUrls\n  ├─ api.loadRoutePackage（wx.loadSubpackage）\n  ├─ api.resolveImageUrls（cloud:// → https，失败回退 /pkg-*/assets）\n  └─ render → image preview / share'))
story.append(H2('6.3 新增作者路线的最小改动面'))
story.append(B('data/localMapIndex.js：登记 author，新增 route（id、authorId、packageRoot、assetNamespace、shapes、shapeDetails）。'))
story.append(B('运行 tools/sync-assets.ps1：生成 pkg-{routeId}/assets 与缺失检查。'))
story.append(B('app.json：注册新分包的 pages/redirect/redirect；创建对应 4 个文件。'))
story.append(B('上传 pkg-*/assets 到云存储 assetNamespace 后，运行 node tools/gen-cloud-assets.js。'))
story.append(B('最后运行 node tools/validate-project.js 并在开发者工具与真机验证。'))
story.append(PageBreak())

# ============ 7 发布与维护检查表 ============
story += H1('7. 发布与维护检查表')
story.append(TBL(
    ['环节', '检查项', '通过标准'],
    [
        ['代码与索引', '运行 node tools/validate-project.js', 'Validation passed: 1119 checks，零失败'],
        ['编译', '微信开发者工具编译与代码质量检查', '无 WXML/WXSS 编译错误'],
        ['主流程', '首页→详情、整图路线、图鉴搜索、详情弹层、反馈草稿', '均可正常操作'],
        ['真机', '云图片、长按图片、全屏预览、分享落地页', '真机体验正常'],
        ['云函数', '部署 addFeedback；反馈提交成功', 'feedback 集合可写入，草稿被清除'],
        ['资源一致', '本地分包、索引、cloudAssets.js 三者一致', '每个文件都有云映射或合法兜底'],
        ['素材同步', 'tools/sync-assets.ps1 后检查 import-report.json', 'Missing / Extra 均为空'],
        ['旧链接', '旧 id（如 hard、v0710）仍能打开', '解析到新 route.id，分享输出新 id'],
    ],
    widths=(26*mm, 84*mm, 66*mm),
))
story.append(PageBreak())

# ============ 8 总结 ============
story += H1('8. 总结与改进建议')
story.append(H2('8.1 一句话总结'))
story.append(P('这是一个“数据索引驱动 + 云端/本地双通道 + 工具脚本兜底”的查询型微信小程序：页面逻辑很薄，维护重点在数据、素材与发布流程。'))
story.append(H2('8.2 项目当前优点'))
story.append(B('查询路径短，核心链路只有“首页 → 查询页 → 详情页”三层。'))
story.append(B('数据与页面解耦，新增作者不复制业务逻辑。'))
story.append(B('容错完整：加载、空数据、参数错误、图片失败、提交失败均有独立状态。'))
story.append(B('自动化程度高：素材同步、云映射生成、完整性校验形成闭环。'))
story.append(B('多作者与旧分享链接兼容策略清晰。'))
story.append(H2('8.3 后续可优化方向（按优先级）'))
story.append(TBL(
    ['优先级', '方向', '价值'],
    [
        ['P0', '继续把“索引-素材-云映射”一致性检查作为发布门禁', '防止图片串版与发布缺图'],
        ['P1', '路线增加更新时间、适用游戏版本、变更摘要', '降低内容过期风险'],
        ['P2', '最近查看记录、形状/侧门搜索', '进一步减少重复点击'],
        ['P2', '图鉴增加品质与刷新难度筛选', '数据量增长后更快定位'],
        ['P3', '匿名访问统计、图片失败日志、无结果搜索记录', '指导内容维护优先级'],
        ['P3', '反馈处理状态（待确认/处理中/已解决）', '运营化反馈闭环'],
    ],
    widths=(20*mm, 82*mm, 74*mm),
))
story.append(H2('8.4 给新维护者的三句话'))
story.append(B('改数据先看 localMapIndex.js，改行为先看 api.js 和对应页面。'))
story.append(B('任何素材变更后，先跑 tools/validate-project.js，再考虑发布。'))
story.append(B('云文件没有真正上传前，不要运行 gen-cloud-assets.js。'))
story.append(PageBreak())

# ============ 9 本轮改造记录 ============
story += H1('9. 本轮改造记录')
story.append(P('以下改造已完成并通过 node tools/validate-project.js 全部校验（1119 checks）。'))
story.append(TBL(
    ['改造项', '改动内容', '效果'],
    [
        ['云配置统一', '新增 config/cloud.js；app.js 与 gen-cloud-assets.js 共用 envId 与 storagePrefix', '避免云环境 ID 与 fileID 前缀漂移'],
        ['素材格式一致性', '路线素材统一为 .jpg；sync-assets.ps1 自动从源盘同名 .png 查找并输出正确扩展名；索引同步改名', '修复 .png 文件名包含 JPEG 字节的问题，分包体积回到 2MB 以内'],
        ['图标降级修复', 'getShapeIconUrl 增加 cloudReady 判断；新增 getShapeIconLocalUrl；图标图片与预览增加 binderror 本地回退', '云不可用时凉哈皮图标直接显示本地分包图标'],
        ['分包预热', 'explorer 选中路线时立即 loadRoutePackage', '用户选择形状/入口期间后台下载图片分包，详情页更快'],
        ['临时链接请求加固', 'getTempFileURL 按 50 个一批拆分；缓存最多保留 400 条', '适配接口上限，防止 storage 无限增长'],
        ['校验工具增强', '覆盖 bindlongpress 与分包页面；新增图片扩展名/文件头一致性检查；新增云配置与图标回退检查', '校验项从 773 提升到 1119，堵住原有盲区'],
        ['文档与清理', '更新 CLOUD_STORAGE_GUIDE.md 格式约定；删除未使用的 utils 与占位图', '减少误导与仓库冗余'],
        ['循环冒烟修复', '清理 explorer 单入口自动跳转时的残留弹层；移除索引中的 0 图片空入口并在页面层防御过滤', '避免展示“0 张路线图”无效选项'],
        ['图鉴图标本地化', '54 张 BWIKI 外链图标下载压缩到 images/inventory，并同步改索引为本地路径', '图鉴不再依赖外链域名，弱网可用'],
        ['反馈草稿持久化', '反馈截图复制到 USER_DATA_PATH；恢复草稿时校验文件；提交/删除时清理持久化文件', '小程序重启后截图草稿仍可恢复'],
        ['首页状态清理', '首页 onShow 时清除 currentMode 筛选状态', '返回首页不再残留上次难度筛选'],
        ['云函数依赖锁定', 'wx-server-sdk 从 latest 锁定到 4.0.2', '避免重新部署时依赖漂移'],
        ['私密配置脱敏', 'project.private.config.json 加入 .gitignore 并停止 Git 跟踪', '避免开发者本地配置进入仓库'],
    ],
    widths=(30*mm, 92*mm, 54*mm),
))
story.append(Spacer(1, 6))
story.append(callout('需要人工跟进', '路线 .png→.jpg 后，云端旧 .png 文件不会自动迁移。请把现役分包 assets 重新上传到云存储，再运行 node tools/gen-cloud-assets.js 并做一次真机验证。'))

def on_page(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, A4[0], 14*mm, stroke=0, fill=1)
        canvas.setFillColor(C_GOLD)
        canvas.setFont('YHB', 8)
        canvas.drawString(14*mm, 5*mm, '加页手记攻略 · 项目分析与学习指南')
        canvas.setFillColor(C_SUB)
        canvas.setFont('YH', 8)
        canvas.drawRightString(A4[0]-14*mm, 5*mm, f'第 {doc.page - 1} 页')
    canvas.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4,
                      leftMargin=14*mm, rightMargin=14*mm, topMargin=12*mm, bottomMargin=18*mm,
                      title='加页手记攻略 · 项目分析与学习指南',
                      author='加页手记攻略组')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='main')
def on_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(C_GOLD)
    canvas.setLineWidth(1.2)
    canvas.line(14*mm, 30*mm, A4[0]-14*mm, 30*mm)
    canvas.restoreState()

cover_template = PageTemplate(id='cover', frames=[frame], onPage=on_cover)
content_template = PageTemplate(id='content', frames=[frame], onPage=on_page)
doc.addPageTemplates([cover_template, content_template])

story = [NextPageTemplate('content')] + story
backup_pdf = OUT + '.bak'
if os.path.exists(OUT):
    if os.path.exists(backup_pdf):
        try:
            os.remove(backup_pdf)
        except OSError:
            pass
    os.rename(OUT, backup_pdf)
doc.build(story)
if os.path.exists(backup_pdf):
    try:
        os.remove(backup_pdf)
    except OSError:
        print('提示：请手动删除旧备份文件', backup_pdf)
print('PDF generated:', OUT, round(os.path.getsize(OUT)/1024, 1), 'KB')

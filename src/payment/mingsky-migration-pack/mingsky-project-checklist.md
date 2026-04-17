# MingSky Project Checklist

## 1. 新仓库建立

- 新建独立仓库，例如 `mingsky-astrology`
- 不从 `tianji-fortune` 继续开发
- 明空的 issue / PR / deployment 全部独立

## 2. 代码迁移

- 使用 `export-mingsky-migration-pack.ps1` 导出历史快照
- 只迁移 `mingsky-migration-manifest.json` 里列出的文件
- 不迁移：
  - `src/v2/**`
  - `src/components/MingMeV2_UI.tsx`
  - 明己专属 i18n / prompt / companion / paywall 文案

## 3. 应用身份

- 修改 `app.json`
  - `name = MingSky Astrology`
  - `slug = mingsky-astrology`
  - `ios.bundleIdentifier = com.mingsky.astrology`
  - `android.package = com.mingsky.astrology`
- 核对：
  - App Store / TestFlight 不复用明己 app id
  - Android 包名不复用明己

## 4. 品牌资源

- 明空 logo、icon、splash、favicon 全部独立放在明空仓库
- 不再从明己仓库引用任何 icon 或 PWA 资源
- 安装图标链路单独检查：
  - `app.json`
  - `public/manifest.json`
  - `public/app.webmanifest`
  - `public/apple-touch-icon.png`
  - `public/icons/*`
  - `src/utils/pwaWeb.js`

## 5. Web / PWA / 部署

- 新建独立 Render static site
- 新建独立域名或子域名
- 新建独立 service worker cache version 体系
- 不和明己共用：
  - manifest
  - offline page
  - PWA install analytics key

## 6. 后端与环境变量

- 核对 `src/services/aiBackendConnector.js`
- 明空如果短期复用明己 AI 服务，只允许复用 API，不允许复用前端品牌壳
- 长期建议：
  - 明空独立 backend base URL
  - 明空独立 auth token
  - 明空独立 tracking / event namespace

## 7. 内容与产品边界

- 明空：星盘 / 报告 / 占星解释产品
- 明己：原有 AI 陪伴 / 命理解读 / 个人成长产品
- 两者不得再共用：
  - 首页
  - 顶部导航
  - 会员文案
  - 注册 / 付费入口
  - 安装图标

## 8. 上线前核对

- 网页标题是 `MingSky Astrology`
- 安装到桌面的图标是“明空”
- 明空首页不再出现“明己”字样
- 明己首页不再出现“明空”字样
- 两个项目能分别独立部署和回滚

## 9. 推荐迁移顺序

1. 导出明空迁移包
2. 建新仓库
3. 放入迁移包代码
4. 先跑通 web build
5. 配独立 Render
6. 再做独立 iOS / Android 打包


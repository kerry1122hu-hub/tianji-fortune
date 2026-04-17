# MingSky Migration Pack

这个目录是把“明空 / MingSky Astrology”从 `tianji-fortune` 中彻底拆出去用的迁移包。

目标很直接：

1. 不再让“明己”和“明空”共用同一个应用壳。
2. 用一个固定的历史快照，把明空相关代码导出到独立仓库。
3. 后续明空的品牌、部署、账号体系、PWA、图标、包名都单独维护。

## 这份迁移包包含什么

- `mingsky-migration-manifest.json`
  - 定义明空应从哪个历史 commit 提取
  - 列出需要导出的文件和目录
- `mingsky-project-checklist.md`
  - 独立项目落地清单
  - 防止再次和明己串线
- `export-mingsky-migration-pack.ps1`
  - 一键从 git 历史快照导出明空迁移包

## 为什么用历史快照导出

因为现在 `tianji-fortune` 已经恢复为“明己”主线。
明空不能再从当前工作树里手工抄，否则很容易把明己最新改动再次混进去。

所以这份包固定使用：

- `source_commit = ad9d09f`

也就是“明空壳层和安装图标已经修好，但尚未回滚为明己之前”的那个稳定快照。

## 建议使用方式

1. 在新的独立目录或新仓库里初始化一个 Expo / React Native 项目
2. 运行本目录的导出脚本，把明空相关文件导出出来
3. 再按照 `mingsky-project-checklist.md` 做包名、域名、后端、部署和品牌核对

## 强隔离原则

从迁移开始，后续必须遵守：

1. 明空独立 repo
2. 明空独立 Render 项目
3. 明空独立 Expo project id / bundle id / package id
4. 明空独立图标、manifest、PWA service worker
5. 明空不得再依赖明己入口文件


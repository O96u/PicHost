# PicHost 文档

欢迎使用 PicHost 用户文档。本站为完整指南的单一事实来源；仓库 README 保留特性摘要与快速开始。

## 推荐阅读顺序

1. [快速开始](./getting-started.md) — Docker 部署与首次设置
2. [环境变量](./configuration.md) — 生产环境配置与后台设置对照
3. [存储](./storage.md) — 多后端与直链模式
4. [API](./api.md) — REST 接口与 Token

## 截图预览

**main** 分支暂无公网演示，以下为 v1.2.0 产品界面。

| 首次设置 | 登录 |
| :------: | :--: |
| ![首次设置](/screenshots/setup.png) | ![登录](/screenshots/login.png) |

| API | 统计与图库 |
| :-: | :--------: |
| ![API](/screenshots/api.png) | ![统计与图库](/screenshots/stats.png) |

| 存储管理 | 系统设置 |
| :------: | :------: |
| ![存储管理](/screenshots/storage.png) | ![系统设置](/screenshots/settings.png) |

| 操作日志 |
| :------: |
| ![操作日志](/screenshots/logs.png) |

## 分支说明

| 分支 | 说明 |
| ---- | ---- |
| [**main**](https://github.com/O96u/PicHost/tree/main) | 主线：多后端、双域名、统一 `images/` 存储；界面见上表 |
| [**cloudflare**](https://github.com/O96u/PicHost/tree/cloudflare) | 仅 Cloudflare R2；在线演示 [pic.roven.cc](https://pic.roven.cc) |

需要多种云存储或完整管理界面请用 **main**；图床只接 R2 可选用 **cloudflare** 分支。

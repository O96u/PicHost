# PicHost 文档资源

本目录主要存放 README 引用的界面截图与分支说明。

## 分支

| 分支 | 说明 |
| ---- | ---- |
| [**main**](https://github.com/O96u/PicHost/tree/main)（默认） | **v1.1.0** 主线：本地磁盘 + 多对象存储（R2 / COS / OSS / AWS）、`/storage` 管理页、混合直链 |
| [**cloudflare**](https://github.com/O96u/PicHost/tree/cloudflare) | **Cloudflare R2 专用线**：面向「只用 R2」的部署场景，配置更聚焦 R2 |

- 需要多种云存储或完整管理界面 → 使用 **main**
- 图床只接 **Cloudflare R2** → 可选用 **`cloudflare`** 分支

## 截图一览

以下为 **main（v1.1.0）** 界面截图。

| 文件 | 说明 |
| ---- | ---- |
| `screenshots/upload.png` | 首页上传区（顶栏含 API / 统计 / 存储 / 设置） |
| `screenshots/storage.png` | 存储管理（`/storage`）：多后端卡片、用量、设默认 |
| `screenshots/stats.png` | 统计与图库 |
| `screenshots/settings.png` | 系统设置（上传偏好 + 系统设置） |
| `screenshots/preferences.png` | 首页上传卡片翻转后的上传偏好 |
| `screenshots/login.png` | 登录页 |

## 相关页面路由（main / v1.1.0）

| 路由 | 权限 | 说明 |
| ---- | ---- | ---- |
| `/` | 登录用户 | 上传与图库入口 |
| `/storage` | 管理员 | 存储后端管理 |
| `/settings` | 管理员 | 系统设置 |
| `/stats` | 登录用户 | 统计 |
| `/api` | 登录用户 | API 文档与 Token |

管理员顶栏：**API** · **统计** · **存储** · **设置**。用户下拉菜单仅 **修改密码**、**退出登录**。

## Cloudflare R2 配置对照

**main**：后台 **存储 → 添加存储 → Cloudflare R2** 预设。

**cloudflare 分支**（R2 专用）：通常以环境变量为主：

| 配置项 | 值 |
| ------ | -- |
| `STORAGE_BACKEND` | `s3` |
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | 桶名 |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | R2 API Token |
| 直链 | 默认 PicHost 代理；桶绑域名后可改公开 URL |

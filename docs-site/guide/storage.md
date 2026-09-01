# 存储

PicHost 支持 **本地磁盘** 与 **S3 兼容对象存储**（Cloudflare R2、腾讯云 COS、阿里云 OSS、AWS S3 等）。管理员在 **存储**（`/storage`）页管理后端；新上传写入 **默认后端**。页面顶部展示 **存储总览**（总量、已用、剩余、使用率与容量分布），下方为各后端卡片与支持的后端类型说明。

![存储管理](/screenshots/storage.png)

## 存储结构（本地）

```
/data
├── pichost.db          # SQLite：用户、会话、设置、storage_backends、images 索引
└── images/             # 本地后端时的全部图片文件
```

- 新上传：`images/随机ID.webp` 或 `images/年/月/随机ID.webp`（可在设置中切换扁平模式）
- 迁移遗留：`images/blog/...` 等子路径
- 云存储时文件在对应桶内，索引仍在 SQLite `images` 表

所有图片 **key** 以 `images/` 开头。上传 API **不再接受** `folder` 参数。

## 添加存储后端

1. 以管理员登录，打开 **存储** → **添加存储**。
2. 选择类型：**本地磁盘** 或 **S3 兼容**（含 R2 / COS / OSS 预设）。
3. 填写连接信息（桶名、Endpoint、Access Key 等）。
4. 保存后可 **设默认**，新上传将写入该后端。

新建对象存储后端的 **存储标识** 按类型自动生成前缀：本地为 `local`；R2 为 `r2-*`；COS 为 `cos-*`；OSS 为 `oss-*`；AWS S3 及自定义 S3 兼容为 `s3-*`（创建后不可修改，图片索引会引用该 ID）。

### Cloudflare R2 要点

| 项 | 值 |
| -- | -- |
| Endpoint | `https://<account_id>.r2.cloudflarestorage.com` |
| Region | `auto` |
| 桶 | 你的 R2 桶名 |
| 密钥 | R2 API Token 的 Access Key / Secret Key |

若仓库 **cloudflare** 分支专用于「仅 R2」部署，也可用环境变量预设，见 [文档首页](./index.md) 分支说明。

### 环境变量（可选）

部分部署用环境变量初始化默认 S3 后端（如 `STORAGE_BACKEND=s3`、`S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_REGION`）。**UI 中配置的后端信息存于 SQLite**，与环境变量并存时以管理界面为准管理多后端。

## 直链模式

每个后端可配置公开 URL 行为：

| 模式 | 说明 |
| ---- | ---- |
| **proxy** | 通过 PicHost 同源代理出图（`GET /images/...`） |
| **public** | 302 重定向到桶/CDN 公网地址 |

复制链接时使用 **图片域名**（`IMAGE_BASE_URL`）拼接路径。开启「隐藏 images 前缀」后 URL 可能更短，服务按文件名或路径反查索引。

## 用量与筛选

- 存储页展示各后端用量（本地扫描目录，对象存储查询 API）
- 图库可按 **存储后端**、**上传来源** 筛选，支持网格/列表视图切换

## 备份

请同时备份：

- `data/images/`（本地后端）
- `data/pichost.db`
- 各云桶中的对象

从 v1.1.x 升级且存在 `data/blog/` 等并列目录时，见 [v1.2 迁移](./migration.md)。

## 相关

- [环境变量](./configuration.md) — `STORAGE_USE_DATE_PATH`、`HIDE_FOLDER_IN_URL`
- [用户与权限](./users-and-permissions.md) — 谁可以管理存储

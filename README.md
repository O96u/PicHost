<p align="center">
  <img src="app/assets/image/logo-light.png" alt="PicHost" width="96" />
</p>

<h1 align="center">PicHost</h1>

<p align="center"><strong>个人轻量图床</strong> · 图片放好，管理也要顺手</p>

<p align="center">自托管图床 / 多用户 / Docker / API / Twikoo · 本地磁盘或对象存储</p>

<p align="center">
  <a href="https://github.com/O96u/PicHost/blob/main/package.json"><img src="https://img.shields.io/github/package-json/v/O96u/PicHost?style=flat-square&color=22c55e" alt="version" /></a>
  <a href="https://github.com/O96u/PicHost/actions/workflows/ci.yml"><img src="https://github.com/O96u/PicHost/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white" alt="Nuxt 4" />
  <a href="https://hub.docker.com/r/muxui/pichost"><img src="https://img.shields.io/badge/Docker-muxui%2Fpichost-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="GPL-3.0" />
</p>

<p align="center">
  <a href="#分支">分支</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#界面预览">预览</a> ·
  <a href="#特性">特性</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#路线图">路线图</a> ·
  <a href="README.en.md">English</a>
</p>

---

## 分支

| 分支 | 说明 |
| ---- | ---- |
| [**main**](https://github.com/O96u/PicHost/tree/main)（默认） | **v1.2.0**（开发中）— 统一 `images/` 存储、多后端、双域名隔离、[`/storage`](docs/README.md)、[`迁移指南`](docs/migration-to-v1.2.md) |
| [**cloudflare**](https://github.com/O96u/PicHost/tree/cloudflare) | **Cloudflare R2 专用线**：面向「只用 R2」的部署，预设与配置更聚焦 R2 |

日常使用、需要管理多种存储后端，请直接用 **main**。

若图床**只接 Cloudflare R2**、希望更简化的 R2 专用版本，可切换分支：

```bash
git clone https://github.com/O96u/PicHost.git
cd PicHost
git checkout cloudflare
```

---

## 界面预览

|                 上传                  |                存储管理                 |
| :-----------------------------------: | :-------------------------------------: |
| ![上传](docs/screenshots/upload.png) | ![存储](docs/screenshots/storage.png) |

|             统计与图库              |                系统设置                 |
| :---------------------------------: | :-------------------------------------: |
| ![统计](docs/screenshots/stats.png) | ![设置](docs/screenshots/settings.png) |

## 特性

- **拖拽 / 点击 / Ctrl+V 粘贴**上传；图片统一存入 `images/`
- **服务端 WebP 压缩**（sharp）、Referer 防盗链、可配置访问域名
- **多用户**：账号密码登录；管理员可开放注册；普通用户仅见自己的图片
- **上传偏好**（首页卡片翻转）：客户端预压缩、自动复制链接、按用户自动删除
- **多后端存储**：本地磁盘 + S3 兼容（Cloudflare R2 / 腾讯云 COS / 阿里云 OSS / AWS S3）；管理员在 **存储**（`/storage`）页管理，新上传写入默认后端
- **混合直链**：`proxy`（PicHost 同源代理）或 `public`（302 到 CDN / 桶公网地址）
- **图库**：浏览、搜索、批量删除；管理员可查看上传者标签
- **统计**：上传/删除趋势、上传来源分布；管理员额外显示注册用户数量
- **API**：全局 Token（管理员）+ 每用户个人 Token；后台可复制 cURL
- **Twikoo**：`POST /api/index.php`（`image` + `token`）
- **Docker 零配置**：首次访问 Web 引导创建管理员，无需预先写密钥

## 快速开始

### Docker（推荐）

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

默认端口 **6892**。浏览器打开 `http://<主机IP>:6892`，按引导创建管理员即可。

**忘记密码**（需能执行 `docker exec`，相当于服务器权限）：

```bash
# 无参数：重置管理员（仅当系统中只有一个管理员时）
docker exec pichost reset-password

# 指定用户名：可重置管理员或普通用户
docker exec pichost reset-password 用户名
```

终端会打印随机新密码；用户不存在时会报错。登录后请到「修改密码」更换。

本地：`npm run reset-password` 或 `npm run reset-password -- 用户名`

### 升级到 v1.2.0（本地磁盘遗留目录）

v1.2.0 起图片统一在 `data/images/`。迁移分两步：

1. **CLI 搬文件**（手动，升级前后均可）：把 `data/` 下除 `images` 外各顶层目录里的图片迁入 `data/images/{原目录名}/...`
2. **启动时同步索引**（自动）：扫描 `data/images/` 补全 SQLite、归一化遗留 key、清理无文件的孤儿记录

```bash
# 1. 预览迁移并生成 data/mapping.json（旧 key → 新 key）
docker exec pichost migrate

# 2. 确认后执行文件移动
docker exec pichost migrate --apply

# 3. 升级镜像并重启；启动日志会打印索引同步过程
```

本地：`npm run migrate` / `npm run migrate -- --apply`。

详细说明（结构对比、日志含义、外链替换、**其它图床迁入**）：[`docs/migration-to-v1.2.md`](docs/migration-to-v1.2.md)

仅对象存储、或图片已在 `data/images/` 下时，可跳过 CLI，仅依赖启动同步。

已克隆仓库时也可用 `docker compose up -d`（见仓库内 `docker-compose.yml`）。

### 本地开发

```bash
npm install
cp .env.example .env   # 可选
npm run dev
```

访问 `http://localhost:3000/setup` 创建管理员；数据目录默认 `./data`。

## 技术栈

| 层级     | 技术                                       |
| -------- | ------------------------------------------ |
| 前端     | Nuxt 4、Vue 3、Nuxt UI 4、Tailwind CSS 4   |
| 后端     | Nitro（Node.js）、SQLite                   |
| 图片处理 | sharp（WebP 转码与压缩）                   |
| 鉴权     | Session Cookie、scrypt 密码哈希、API Token |
| 存储     | 本地磁盘 + S3 兼容后端（R2 / COS / OSS / AWS）；`images` 索引在 SQLite |
| 部署     | Docker（amd64 / arm64）、docker compose    |
| 测试     | Vitest                                     |

## 用户与权限

| 场景                       | 鉴权                 | 图片归属 / 可见范围        |
| -------------------------- | -------------------- | -------------------------- |
| 网页上传                   | Session              | 当前登录用户               |
| API 上传 + **个人 Token**  | `Auth-Token`         | 该 Token 所属用户          |
| API 上传 + **全局 Token**  | `Auth-Token`         | 管理员（`userId` 为空）    |
| Twikoo `/api/index.php`    | 表单 `token`         | 与全局 Token 相同          |
| 图库列表 / 搜索 / 删除     | Session 或 Token     | 普通用户仅自己；管理员全部 |
| 图片直链 `GET /images/...` | 无（Referer 防盗链） | 知道 URL 即可访问          |

所有上传统一存入 `images/` 目录。

## 存储结构

```
/data
├── pichost.db          # SQLite：用户、会话、设置、storage_backends、images 索引
└── images/             # 全部图片（本地后端时）；可含迁移子路径如 file/、年/月/日/
```

路径规则：新上传为 `images/随机ID.webp` 或 `images/年/月/随机ID.webp`；迁移遗留可为更深子路径（如 `images/blog/...`）。元数据在 SQLite `images` 表；云存储时文件在对应桶内。备份请包含 `data/images/`、`pichost.db` 与云桶数据。

从 v1.1.x 升级且存在 `data/blog/` 等并列目录时，见 [升级到 v1.2.0](#升级到-v120本地磁盘遗留目录) 或 [`docs/migration-to-v1.2.md`](docs/migration-to-v1.2.md)。

## API 概览

| 方法   | 路径                 | 说明                   |
| ------ | -------------------- | ---------------------- |
| POST   | `/api/images/upload` | 上传图片               |
| GET    | `/api/images`        | 分页列表               |
| DELETE | `/api/images`        | 删除单张（`key`）      |
| POST   | `/api/index.php`     | Twikoo / EasyImage 2.0 |

上传示例：

```bash
curl -X POST "https://pic.example.com/api/images/upload" \
  -H "Auth-Token: YOUR_TOKEN" \
  -F "image=@./demo.png"
```

完整接口与可复制 cURL 见部署后后台 **API** 页。

## Twikoo

| 配置项            | 值                               |
| ----------------- | -------------------------------- |
| `IMAGE_CDN`       | `easyimage`                      |
| `IMAGE_CDN_URL`   | `https://你的域名/api/index.php` |
| `IMAGE_CDN_TOKEN` | 与 `API_UPLOAD_TOKEN` 相同       |

## 反向代理

- 反代到容器 **6892** 端口，建议 HTTPS
- Nginx：`client_max_body_size` ≥ 12m
- 公网访问请配置 `IMAGE_BASE_URL`（单域名）或 `SITE_BASE_URL` + `IMAGE_BASE_URL`（双域名分离）

### 推荐部署架构（双域名分离）

**单 Docker 实例 + 两个域名** 均可全量反代到 `6892`（隔离由 PicHost 中间件负责）：

```nginx
# admin.example.com — 后台 + API + 出图
server {
  server_name admin.example.com;
  location / {
    proxy_pass http://127.0.0.1:6892;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 12m;
  }
}

# pic.example.com — 同样全量反代；PicHost 中间件会拦截非图片路径
server {
  server_name pic.example.com;
  location / {
    proxy_pass http://127.0.0.1:6892;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

飞牛 NAS [Lucky](https://github.com/gdy666/lucky) 反向代理示例（前端域名 → 后端 `http://<内网IP>:6892`）：

| 网站域名（管理后台） | 图片域名 |
| :------------------: | :------: |
| ![Lucky 网站域名](docs/screenshots/lucky-site.png) | ![Lucky 图片域名](docs/screenshots/lucky-image.png) |

完整说明（Caddy / NPM、环境变量、初始化填写项）见 **[docs/domain-separation.md](docs/domain-separation.md)**。

## 开发

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run start        # 运行 .output
npm run lint         # ESLint
npm run typecheck    # 类型检查
npm test               # 单元测试
npm run reset-password # 重置密码（可选用户名参数）
npm run migrate        # 预览遗留目录迁移（加 -- --apply 执行）
```

## 路线图

| 版本       | 说明                                              |
| ---------- | ------------------------------------------------- |
| **v1.2.0** | 统一 `images/` 存储、遗留目录 CLI 迁移、启动索引同步、上传来源统计（开发中） |
| **v1.1.5** | 图库预览可靠性：自动重试、出图前校验、错误响应禁缓存 |
| **v1.1.4** | 存储路径扁平/分组、basename 外链、双域名双向隔离 |
| **v1.1.3** | 双域名分离、隐藏 `images/` 前缀、版本更新提示 |
| **v1.1.2** | 操作日志、图库存储筛选、上传限流                  |
| **v1.1.1** | 会话校验与存储占位修复、Docker 日志增强           |
| **v1.1.0** | S3 / R2 多后端对象存储、混合直链、存储管理页          |
| **v1.0.4** | 密码显示切换、遗留 ADMIN_SECRET 迁移对齐          |
| **v1.0.3** | CI 与 Docker 多架构构建修复                       |
| **v1.0.2** | 中英文、移动端菜单、统计/上传 UI、Docker 重置密码 |
| **v1.0.1** | 设置页版本展示、移动端上传偏好布局修复            |
| **v1.0.0** | 本地存储、多用户、API、Twikoo                     |

## License

[GPL-3.0](LICENSE)

## 友链

[LINUX DO](https://linux.do/)

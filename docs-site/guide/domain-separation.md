# 双域名分离 · 推荐部署架构

启用「后台与图片域名分离」后，管理后台、API 与图片直链使用不同域名。PicHost 通过 **Host 中间件** 双向隔离：

- **网站域**：后台、API、上传；**禁止**直链出图（图片路径返回 404）
- **图片域**：仅放行图片路径；其余请求返回 404

## 架构说明

**单 Docker 实例 + 两个域名**，均可 **全量反代** 到 `6892`（隔离由 PicHost 中间件负责，无需在 Nginx 层拆分路径）。

| 域名 | 用途 |
| ---- | ---- |
| `admin.example.com` | 管理后台、API、Twikoo 上传 |
| `pic.example.com` | 图片直链（中间件拦截非图片路径） |

初始化时在 `/setup` 或后台 **设置** 中填写：

- **网站域名**：`https://admin.example.com`
- **图片域名**：`https://pic.example.com`

## Nginx 示例

```nginx
# admin.example.com — 后台 + API（不出图，直链请走图片域）
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

# 默认 server：拒绝裸 IP、未配置域名等其它 Host（生产环境强烈建议）
server {
  listen 443 ssl default_server;
  listen 80 default_server;
  server_name _;
  return 444;
}
```

> Caddy、NPM（Nginx Proxy Manager）等工具同理：两个域名均反代到 `http://<主机>:6892`，并保留 `Host` 与 `X-Forwarded-Proto` 头。

## 安全与注意事项

### 中间件只隔离「已配置的两个域名」

PicHost 根据请求 **Host**（反代会转发为 `X-Forwarded-Host`，应用会一并识别）判断当前是网站域还是图片域：

- **图片域**：非图片路径（如 `/`、`/settings`）→ 404
- **网站域**：图片直链路径（如 `/images/...`）→ 404

若 Host **既不是网站域也不是图片域**（例如 `localhost`、服务器 **公网 IP**、Cloudflare **Pages** 的 `*.pages.dev`、**Workers** 的 `*.workers.dev`、或其它未在设置里填写的域名），**当前版本不会拦截**，后台与 API 仍可能被访问。这与域名是否带 `-`、长短无关，而是多了一条未纳入双域名配置的入口。

**生产环境建议：**

1. 反代层仅为网站域、图片域配置 `server_name`，并增加 **default server** 拒绝其它 Host 与裸 IP（见上方 Nginx 示例）
2. 使用 Cloudflare **橙云** 时，源站防火墙 **仅放行 [Cloudflare IP 段](https://www.cloudflare.com/ips/)**，避免绕过 CDN 直连源站
3. **仅使用** 设置中的网站域名登录后台，不要用 `localhost`、IP 或未配置的域名混用
4. **不要** 用 Cloudflare Pages / Workers 对 PicHost **整站反代**（会多出 `pages.dev` / `workers.dev` 等第三入口，且易出现上述绕过）
5. PicHost **不能** 作为 Node 应用直接部署到 Pages/Workers（依赖 `node-server`、SQLite、`sharp` 与本地 `data/`）；应用请继续 Docker/VPS 部署，CF 侧用橙云 DNS + 可选 R2 存储即可

### Cloudflare 橙云（含 DNS 优选）

**推荐架构：** `admin.example.com` 与 `pic.example.com` 均 **DNS Proxied（橙云）** → 源站 Nginx / 1Panel 反代 `6892`，SSL 模式 **Full (strict)**（源站可用 Cloudflare Origin Certificate）。

| 能力 | 说明 |
| ---- | ---- |
| 橙云 CDN | 与 PicHost 双域名兼容；回源须保留 `Host`、`X-Forwarded-Proto` |
| DNS 优选 | 仅改变用户连到 CF 边缘的 IP，Host 仍为正式域名，无额外配置 |
| R2 对象存储 | 在 **存储** 页添加 R2 后端即可，与是否橙云无关 |
| `cloudflare` Git 分支 | R2 专用部署线，仍是 Docker 运行，**不是** Workers 托管 |

**勿混淆：** CF 控制台「创建 Worker」并连接本仓库 **无法** 直接部署 PicHost；`npm run build` + `wrangler deploy` 与当前 `node-server` 预设不兼容。

反代与源站加固详见 [反向代理](./reverse-proxy.md#cloudflare-橙云)。

## 飞牛 NAS · Lucky 反向代理

在 [Lucky](https://github.com/gdy666/lucky) 中为两个域名各建一条 **反向代理** 规则，**前端地址** 填公网域名，**后端地址** 填 PicHost 所在内网 IP 与端口（如 `http://192.168.8.3:6892`）。

**网站域名（管理后台）**

| 项 | 示例值 |
| -- | ------ |
| 服务类型 | 反向代理 |
| 前端地址 | `admin.pichost.com` |
| 后端地址 | `http://192.168.8.3:6892` |

**图片域名**

| 项 | 示例值 |
| -- | ------ |
| 服务类型 | 反向代理 |
| 前端地址 | `image.pichost.com` |
| 后端地址 | `http://192.168.8.3:6892` |

两条规则的后端地址相同即可；域名分离与路径隔离由 PicHost 根据请求 `Host` 自动处理。

## 环境变量（可选）

除 Web 设置外，也可在 `.env` 或 Docker 环境中配置：

```env
SITE_BASE_URL=https://admin.example.com
IMAGE_BASE_URL=https://pic.example.com
```

详见 [环境变量](./configuration.md)。

## 本地测试（Windows / macOS）

### 1. 修改 hosts

```text
127.0.0.1 admin.pichost.test
127.0.0.1 pic.pichost.test
```

建议使用 `.test` 后缀，避免 `.local` 在部分系统上与 mDNS 冲突。

### 2. 启动开发服务

```bash
npm run dev
```

项目已默认绑定 `127.0.0.1:3000`（与 hosts 的 IPv4 一致）。若曾出现 `ping` 通但浏览器连不上，多半是 dev 只监听了 IPv6 `::1`。

### 3. 填写双域名

| 项 | 示例 |
| -- | ---- |
| 网站域名 | `http://admin.pichost.test:3000` |
| 图片域名 | `http://pic.pichost.test:3000` |

**后台请始终用网站域名打开**，不要用 `localhost`（Cookie 与 Host 不一致）。

### 4. 预期结果

| 地址 | 预期 |
| ---- | ---- |
| `http://admin.pichost.test:3000/` | 正常进入后台 |
| `http://admin.pichost.test:3000/images/...` 或 `/2026/08/xxx.webp` | **404**（请用图片域直链） |
| `http://pic.pichost.test:3000/` | **404**（正常，图片域不提供后台） |
| `http://pic.pichost.test:3000/images/...` | 能出图 |
| `http://localhost:3000/` 或 `http://127.0.0.1:3000/` | **能打开后台**（第三 Host，隔离不生效；仅开发可接受，生产须用反代封禁） |

上传一张图后，复制链接应指向 `pic.pichost.test` 域名；在后台图库中缩略图也应能正常显示。

## 相关说明

- 两个域名 **主机名不能相同**（可同机、不同子域）
- 设置里的网站域 / 图片域须与反代 `server_name` **完全一致**（含是否带 `www`）
- 图片域无需单独部署静态目录；与 EasyImages 等不同，PicHost 在应用内完成隔离
- 单域名部署可不启用分离，仅配置 `IMAGE_BASE_URL` 或使用默认当前访问域名
- 配置了 Referer 防盗链时，网站域与图片域会自动加入白名单，无需手写两个域名

单域名反代要点见 [反向代理](./reverse-proxy.md)。英文版：[Dual-domain separation](/en/guide/domain-separation)

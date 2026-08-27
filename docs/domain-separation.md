# 双域名分离 · 推荐部署架构

启用「后台与图片域名分离」后，管理后台、API 与图片直链使用不同域名。PicHost 通过 **Host 中间件** 在应用层隔离：图片域仅放行图片路径，其余请求返回 404。

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

> Caddy、NPM（Nginx Proxy Manager）等工具同理：两个域名均反代到 `http://<主机>:6892`，并保留 `Host` 与 `X-Forwarded-Proto` 头。

## 飞牛 NAS · Lucky 反向代理

在 [Lucky](https://github.com/gdy666/lucky) 中为两个域名各建一条 **反向代理** 规则，**前端地址** 填公网域名，**后端地址** 填 PicHost 所在内网 IP 与端口（如 `http://192.168.8.3:6892`）。

**网站域名（管理后台）**

| 项 | 示例值 |
| -- | ------ |
| 服务类型 | 反向代理 |
| 前端地址 | `admin.pichost.com` |
| 后端地址 | `http://192.168.8.3:6892` |

![Lucky 网站域名配置](screenshots/lucky-site.png)

**图片域名**

| 项 | 示例值 |
| -- | ------ |
| 服务类型 | 反向代理 |
| 前端地址 | `image.pichost.com` |
| 后端地址 | `http://192.168.8.3:6892` |

![Lucky 图片域名配置](screenshots/lucky-image.png)

两条规则的后端地址相同即可；域名分离与路径隔离由 PicHost 根据请求 `Host` 自动处理。

## 环境变量（可选）

除 Web 设置外，也可在 `.env` 或 Docker 环境中配置：

```env
SITE_BASE_URL=https://admin.example.com
IMAGE_BASE_URL=https://pic.example.com
```

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
| `http://pic.pichost.test:3000/` | **404**（正常，图片域不提供后台） |
| `http://pic.pichost.test:3000/images/...` | 能出图 |
| `http://localhost:3000/` | 能打开，但与双域名配置无关，登录态不共享 |

上传一张图后，复制链接应指向 `pic.pichost.test` 域名；在后台图库中缩略图也应能正常显示。

## 相关说明

- 两个域名 **主机名不能相同**（可同机、不同子域）
- 图片域无需单独部署静态目录；与 EasyImages 等不同，PicHost 在应用内完成隔离
- 单域名部署可不启用分离，仅配置 `IMAGE_BASE_URL` 或使用默认当前访问域名
- 配置了 Referer 防盗链时，网站域与图片域会自动加入白名单，无需手写两个域名

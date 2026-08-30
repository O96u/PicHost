# 反向代理

生产环境建议通过 Nginx、Caddy、NPM（Nginx Proxy Manager）或 NAS 自带反代，将 HTTPS 流量转发到 PicHost 容器 **6892** 端口。

## 基本要求

- 反代目标：`http://127.0.0.1:6892`（或容器所在主机 IP）
- 保留请求头：`Host`、`X-Forwarded-Proto`（及常见的 `X-Forwarded-For`）
- 上传大小：Nginx 建议 `client_max_body_size 12m` 或更大
- 公网访问请配置 **HTTPS**

## 单域名示例（Nginx）

管理、API、出图同一域名：

```nginx
server {
  server_name pic.example.com;
  location / {
    proxy_pass http://127.0.0.1:6892;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 12m;
  }
}
```

环境变量（可选）：

```env
IMAGE_BASE_URL=https://pic.example.com
```

未设置 `IMAGE_BASE_URL` 时，PicHost 会根据反代转发的 `Host` 与 `X-Forwarded-Proto` 推断公网地址。

## 双域名

若后台与图片使用不同域名，两个 `server` 块均可 **全量反代** 到同一端口；隔离由 PicHost 中间件完成。

详见专章：[双域名分离](./domain-separation.md)。

## Cloudflare 橙云

详见专章：[Cloudflare / CF 优选部署](./cloudflare-deployment.md)。

| 做法 | 说明 |
| ---- | ---- |
| **DNS 橙云** | `admin` / `img` 两个子域 Proxied → 源站反代 `6892`，SSL **Full (strict)** |
| **DNS 优选** | 与 PicHost 兼容；须保持 **admin → admin、img → img** 回源 |
| **R2** | 在存储页作对象后端，非 Pages 托管应用 |
| **源站防火墙** | 仅放行 [Cloudflare IP](https://www.cloudflare.com/ips/)，禁止公网直连 `6892` |

**不建议：**

- 用 **Cloudflare Pages**（`*.pages.dev`）或 **Workers**（`*.workers.dev`）对 PicHost **整站反代**，或让图片域 **fetch 到管理域** — 会改写 Host、绕过双域名隔离（见 [Cloudflare 部署说明](./cloudflare-deployment.md)）
- 在 CF 控制台「从 Git 创建 Worker」部署本仓库 — 当前为 `node-server` 预设，无法直接 `wrangler deploy`

## 源站安全（双域名推荐）

除 PicHost 中间件外，建议在反代 / 防火墙层加固：

1. **`server_name` 白名单** — 仅网站域与图片域；`default_server` 拒绝裸 IP 与其它 Host
2. **禁止公网暴露 6892** — 仅本机或内网反代访问；公网只开 80/443
3. **橙云时限制源站来源 IP** — 仅 Cloudflare 回源 IP 段

双域名场景下 PicHost **不会** 拒绝未配置的 Host；上述措施由运维层补齐。

## Caddy 示例

```caddy
pic.example.com {
  reverse_proxy 127.0.0.1:6892
}
```

双域名时添加第二个站点块，后端地址相同即可。

## 缓存注意

图片 404/403 与域名隔离 404 响应带 **禁止缓存** 头，避免 CDN 长时间缓存错误页面。若在前端再加 CDN，请对动态 API 路径谨慎缓存。

## 相关

- [环境变量](./configuration.md) — `SITE_BASE_URL`、`IMAGE_BASE_URL`
- [快速开始](./getting-started.md) — Docker 端口

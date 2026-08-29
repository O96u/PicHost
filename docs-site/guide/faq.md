# 常见问题

## 忘记管理员密码怎么办？

能执行 `docker exec` 时：

```bash
docker exec pichost reset-password
# 或指定用户名
docker exec pichost reset-password 用户名
```

本地：`npm run reset-password`。详见 [快速开始](./getting-started.md#忘记密码)。

## 为什么后台无法重新生成 API Token？

若设置了环境变量 `API_UPLOAD_TOKEN`，Token 由环境变量 **锁定**，需修改 env 并 **重启服务**。见 [环境变量](./configuration.md#api-upload-token)。

## 图片外链显示「盗链」或无法加载？

检查 **防盗链白名单**（`ALLOWED_REFERER_HOSTS` 或设置页）。引用图片的站点域名需在白名单中；PicHost 自身域名与双域名场景下的网站域、图片域会自动放行。

## 双域名下为什么用 pages.dev / workers.dev / IP 也能进后台？

PicHost 双域名隔离**只对已配置的网站域、图片域做路径分流**；其它 Host（`localhost`、公网 IP、Cloudflare Pages 的 `*.pages.dev`、Workers 的 `*.workers.dev` 等）**当前不会拦截**，因此可能出现「奇怪地址也能开后台」。

常见原因：在橙云之外又用 **Pages/Workers 整站反代** 到源站，或源站未限制 `server_name` / 允许裸 IP 访问。

处理：仅用正式两个域名访问；反代加 default server；橙云时源站只放行 CF IP。详见 [双域名分离 · 安全与注意事项](./domain-separation.md#安全与注意事项)。

## 能把 PicHost 部署到 Cloudflare Workers / Pages 吗？

**不能（现状）。** 项目使用 `node-server`、SQLite、`sharp` 与本地 `data/`，需 Docker / VPS。CF 控制台「从 Git 创建 Worker」连本仓库会部署失败。

推荐：源站跑 PicHost，CF 用 **橙云 DNS**（含优选）+ 可选 **R2 存储**；不要用 Pages/Workers 反代整站。

## 双域名下后台能打开但缩略图裂图？

- 确认 **图片域名** 配置正确且反代到同一实例
- 后台请用 **网站域名** 打开，不要用 `localhost` 混用
- 见 [双域名分离](./domain-separation.md)

## 升级 v1.2 后图库有删不掉的记录？

可能是 **孤儿索引**（有记录无文件）。重启后启动同步会自动清理；也可手动删除仅索引项。见 [v1.2 迁移](./migration.md#第二步启动时自动同步索引)。

## 遗留 `data/blog/` 目录还要吗？

执行 `migrate --apply` 后文件已迁入 `data/images/blog/`。若原目录只剩空壳或非图片文件，可自行备份后删除；迁移脚本不会删除仍含非图片文件的目录。

## 只用对象存储需要跑 migrate 吗？

不需要。图片在桶内时跳过 CLI；启动同步主要面向本地 `data/images/` 磁盘扫描。

## 如何替换博客里的旧图片 URL？

使用 `data/mapping.json`（`migrate` 预览时生成）批量替换旧 key。注意映射的是 **存储 key**，不是完整旧站 URL。见 [迁移指南](./migration.md#外链与直链)。

## 开发时如何跳过登录？

`DEV_BYPASS_ACCESS=true`（仅本地，勿用于生产）。正常流程请访问 `/setup` 创建管理员。

## 文档与仓库 README 哪个为准？

**本 VitePress 文档站** 为完整用户指南；README 保留摘要与快速开始。在线地址：<https://o96u.github.io/PicHost/>

若访问 404，说明 GitHub Pages 尚未部署成功：请在仓库 **Settings → Pages** 将 Source 设为 **GitHub Actions**，并确认 `docs` workflow 的 deploy 步骤已通过。详见 [本地开发 · 发布到 GitHub Pages](./local-dev.md#发布到-github-pages)。

## GitHub 仓库 About 怎么写？

**main** 分支建议：

- **Description**：`Lightweight self-hosted image hosting — Docker, multi-user, gallery & API, local disk or S3-compatible storage.`
- **Website**：`https://o96u.github.io/PicHost/`（文档站，非图床演示）

勿写「部署在 Cloudflare Pages/Workers」—— PicHost 应用跑在 Docker/VPS；**cloudflare** 分支在线演示为 [pic.roven.cc](https://pic.roven.cc)。

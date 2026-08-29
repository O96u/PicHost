---
layout: home

hero:
  name: PicHost
  text: 个人轻量图床
  tagline: 自托管 · 多用户 · Docker · API · Twikoo · 本地磁盘或对象存储
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 API
      link: /guide/api
    - theme: alt
      text: GitHub
      link: https://github.com/O96u/PicHost

features:
  - title: 拖拽 / 粘贴上传
    details: 支持点击、拖拽与 Ctrl+V 粘贴；服务端 WebP 压缩与 Referer 防盗链。
  - title: 多后端存储
    details: 本地磁盘 + S3 兼容（R2 / COS / OSS / AWS）；proxy 或 public 直链模式。
  - title: 多用户与权限
    details: 管理员与普通用户 RBAC；全局 Token 与个人 Token；图库按归属隔离。
  - title: Docker 零配置
    details: 首次访问 Web 引导创建管理员；`docker exec pichost reset-password` 重置密码。
  - title: 双域名分离
    details: 单实例 + 两个域名全量反代；应用内中间件隔离后台与图片域。
  - title: Twikoo 兼容
    details: "POST /api/index.php 兼容 EasyImage 2.0 协议，评论系统一键接入。"
---

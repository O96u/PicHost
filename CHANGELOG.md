# Changelog

本仓库自 **v1.0.0** 起作为正式版维护；此前历史提交已归档重置。

## [1.0.0] - 2026-08-22

### 新增

- 多用户账号体系：Web 引导创建管理员、用户名密码登录、可选开放注册
- 角色权限：管理员 / 普通用户；图库按 `userId` 隔离，服务端强制校验
- 个人 API Token：每用户独立 Token，脚本上传归属对应账号
- 上传偏好：客户端预压缩、WebP 质量、自动复制链接、按用户自动删除策略
- 管理员系统设置：注册开关、防盗链、访问域名、默认上传目录
- 统计页：图库浏览 / 搜索 / 批量删除；管理员显示注册用户数量
- Twikoo / EasyImage 2.0 兼容：`POST /api/index.php`
- 遗留 `ADMIN_SECRET` 一次性迁移至账号密码

### 技术栈

- Nuxt 4 + Nuxt UI 4
- 本地磁盘存储 + SQLite
- sharp 服务端 WebP 压缩
- Docker 多架构镜像（amd64 / arm64）

### 路线图

- **v1.1.0**（计划中）：S3、Cloudflare R2 及更多对象存储后端

[1.0.0]: https://github.com/O96u/PicHost/releases/tag/v1.0.0

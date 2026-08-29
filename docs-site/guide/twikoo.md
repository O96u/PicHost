# Twikoo

PicHost 兼容 **Twikoo** 与 **EasyImage 2.0** 图片上传协议，评论系统可像接 EasyImage 一样配置。

## Twikoo 配置

在 Twikoo 环境变量或配置中设置：

| 配置项 | 值 |
| ------ | -- |
| `IMAGE_CDN` | `easyimage` |
| `IMAGE_CDN_URL` | `https://你的域名/api/index.php` |
| `IMAGE_CDN_TOKEN` | 与全局 `API_UPLOAD_TOKEN` 相同 |

- 使用 **网站域名**（管理后台域）作为 `IMAGE_CDN_URL` 的主机名
- Token 需在 PicHost **API** 页生成，或通过 `API_UPLOAD_TOKEN` 环境变量设置

## 上传接口

`POST /api/index.php`

表单字段：

| 字段 | 说明 |
| ---- | ---- |
| `image` | 图片文件 |
| `token` | 全局 API Token（与 `Auth-Token` 等效） |

```bash
curl -X POST "https://admin.example.com/api/index.php" \
  -F "token=YOUR_TOKEN" \
  -F "image=@./demo.png"
```

上传的图片存入 `images/` 目录，归属与 **全局 Token** 相同（管理员）。

## 与 REST API 的区别

| 项目 | REST `/api/images/upload` | Twikoo `/api/index.php` |
| ---- | ------------------------- | ------------------------ |
| 鉴权 | `Auth-Token` 请求头 | 表单 `token` |
| 响应格式 | PicHost JSON | EasyImage 兼容 JSON |
| Token | 全局或个人 | 仅全局 Token |

## 双域名部署

Twikoo 上传应走 **网站域名**（`SITE_BASE_URL`），图片展示走 **图片域名**（`IMAGE_BASE_URL`）。详见 [双域名分离](./domain-separation.md)。

## 相关

- [API](./api.md)
- [用户与权限](./users-and-permissions.md)
- [环境变量](./configuration.md)

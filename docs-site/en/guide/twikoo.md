# Twikoo

PicHost supports **Twikoo** and **EasyImage 2.0** image upload — configure your comment system like EasyImage.

## Twikoo settings

| Setting | Value |
| ------- | ----- |
| `IMAGE_CDN` | `easyimage` |
| `IMAGE_CDN_URL` | `https://your-domain/api/index.php` |
| `IMAGE_CDN_TOKEN` | Same as global `API_UPLOAD_TOKEN` |

- Use your **site hostname** (admin domain) in `IMAGE_CDN_URL`
- Generate the token in PicHost **API** or set `API_UPLOAD_TOKEN`

## Upload endpoint

`POST /api/index.php`

| Field | Description |
| ----- | ----------- |
| `image` | Image file |
| `token` | Global API token (same as `Auth-Token`) |

```bash
curl -X POST "https://admin.example.com/api/index.php" \
  -F "token=YOUR_TOKEN" \
  -F "image=@./demo.png"
```

Files are stored under `images/` and owned by the **global token** account (admin).

## REST vs Twikoo

| Aspect | REST `/api/images/upload` | Twikoo `/api/index.php` |
| ------ | ------------------------- | ------------------------ |
| Auth | `Auth-Token` header | form `token` |
| Response | PicHost JSON | EasyImage-compatible JSON |
| Token | Global or personal | Global only |

## Dual-domain

Point Twikoo uploads at **SITE_BASE_URL**; public images use **IMAGE_BASE_URL**. See [Dual-domain separation](./domain-separation.md).

## See also

- [API](./api.md)
- [Users & permissions](./users-and-permissions.md)
- [Environment variables](./configuration.md)

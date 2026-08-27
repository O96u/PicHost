# Dual-domain separation · Recommended deployment

When admin and image domains are split, the admin UI, API, and public image links use different hostnames. PicHost enforces isolation in **application middleware**: the image host only serves image paths; other requests return 404.

## Architecture

**One Docker instance + two domains**, both **fully reverse-proxied** to port `6892` (isolation is handled by PicHost middleware; no path splitting in Nginx).

| Domain | Purpose |
| ------ | ------- |
| `admin.example.com` | Admin UI, API, Twikoo upload |
| `pic.example.com` | Public image links (non-image paths blocked) |

Set during `/setup` or in **Settings**:

- **Site URL**: `https://admin.example.com`
- **Image URL**: `https://pic.example.com`

## Nginx example

```nginx
# admin.example.com — admin + API + images
server {
  server_name admin.example.com;
  location / {
    proxy_pass http://127.0.0.1:6892;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 12m;
  }
}

# pic.example.com — same full proxy; PicHost middleware blocks non-image paths
server {
  server_name pic.example.com;
  location / {
    proxy_pass http://127.0.0.1:6892;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> Caddy, NPM, and similar tools work the same: proxy both hostnames to `http://<host>:6892` and forward `Host` and `X-Forwarded-Proto`.

## FN NAS · Lucky reverse proxy

In [Lucky](https://github.com/gdy666/lucky), create one **reverse proxy** rule per domain. **Frontend** is the public hostname; **backend** is PicHost on your LAN (e.g. `http://192.168.8.3:6892`).

**Site domain (admin)**

| Field | Example |
| ----- | ------- |
| Service type | Reverse proxy |
| Frontend | `admin.pichost.com` |
| Backend | `http://192.168.8.3:6892` |

![Lucky site domain](screenshots/lucky-site.png)

**Image domain**

| Field | Example |
| ----- | ------- |
| Service type | Reverse proxy |
| Frontend | `image.pichost.com` |
| Backend | `http://192.168.8.3:6892` |

![Lucky image domain](screenshots/lucky-image.png)

Both rules can point to the same backend; PicHost applies host-based isolation automatically.

## Environment variables (optional)

```env
SITE_BASE_URL=https://admin.example.com
IMAGE_BASE_URL=https://pic.example.com
```

## Notes

- Hostnames must **differ** (same machine, different subdomains is fine)
- No separate static root on the image domain; unlike EasyImages, PicHost isolates in-app
- Single-domain setups can skip separation and use `IMAGE_BASE_URL` or the request host

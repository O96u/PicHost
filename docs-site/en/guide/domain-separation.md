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

Setup and Settings **do not** auto-fill the site URL from `window.location.origin`; use manual input or “Use detected URL”. Disabling dual-domain requires confirmation and clears the site URL. Saves include `domainSeparation: true/false`. See [Changelog](./changelog.md#1-2-2-2026-08-30).

## Nginx example

```nginx
# admin.example.com — admin + API
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

# Default server: reject bare IP and unknown Host values (strongly recommended in production)
server {
  listen 443 ssl default_server;
  listen 80 default_server;
  server_name _;
  return 444;
}
```

> Caddy, NPM, and similar tools work the same: proxy both hostnames to `http://<host>:6892` and forward `Host` and `X-Forwarded-Proto`.

## Security notes

### Middleware isolation and third hosts

PicHost uses the request **Host** (and `X-Forwarded-Host` when proxied) to decide site vs image domain:

- **Image host**: non-image paths (e.g. `/`, `/settings`) → 404
- **Site host**: image URL paths (e.g. `/images/...`) → 404
- **Unconfigured third hosts** (e.g. `*.pages.dev`, bare IP, old image domains): **from v1.2.x the app returns 404 for all methods** (`localhost` / `127.0.0.1` are exempt in development for `npm run dev`)

This is independent of hyphenated or long domain names. Older versions did not block third hosts; rely on a reverse-proxy default server as a complement in production.

**Production recommendations:**

1. Configure `server_name` only for the site and image hosts; add a **default server** to reject other Host values and bare IP access (see Nginx example above; complements app-layer blocking)
2. With Cloudflare **orange-cloud** DNS, restrict the origin firewall to **[Cloudflare IP ranges](https://www.cloudflare.com/ips/)** so traffic cannot bypass the CDN
3. Sign in only on the **site hostname** from Settings; do not mix `localhost`, IP, or unlisted domains
4. Do **not** put Cloudflare Pages / Workers in front of PicHost as a **full-site reverse proxy** (`IMAGE_BASE_URL` may point at a CDN URL, but the app itself should run on Docker/VPS)
5. If you must proxy at the edge, preserve the client **`Host` or `X-Forwarded-Host`** or host isolation will fail
6. PicHost **cannot** run as-is on Pages/Workers (needs `node-server`, SQLite, `sharp`, local `data/`). Keep Docker/VPS; use orange-cloud DNS and optional R2 storage on CF

### Cloudflare orange cloud (incl. preferred edge IPs)

Full guide: [Cloudflare deployment](./cloudflare-deployment.md).

**Recommended:** both `admin.example.com` and `pic.example.com` **DNS Proxied** → origin Nginx / 1Panel → port `6892`, SSL **Full (strict)**.

| Feature | Notes |
| ------- | ----- |
| Orange-cloud CDN | Compatible with dual-domain; preserve `Host` and `X-Forwarded-Proto` on origin |
| DNS “preferred IP” setups | Only changes which CF edge IP clients hit; origin identity must stay **admin → admin**, **img → img** |
| R2 storage | Add an R2 backend under **Storage**; independent of orange cloud |
| `cloudflare` Git branch | R2-focused deployment line; still Docker, **not** Workers hosting |

**Do not confuse** “Create Worker” in the CF dashboard (Git + `wrangler deploy`) with deploying PicHost — the repo uses `nitro.preset: 'node-server'` and is not Workers-ready.

**Do not** chain the image hostname to `fetch(admin…)` via Pages/Workers — that rewrites Host and breaks isolation ([bad topologies](./cloudflare-deployment.md#6-typical-bad-topologies)).

See [Reverse proxy](./reverse-proxy.md#cloudflare-orange-cloud) for origin hardening.

## FN NAS · Lucky reverse proxy

In [Lucky](https://github.com/gdy666/lucky), create one **reverse proxy** rule per domain. **Frontend** is the public hostname; **backend** is PicHost on your LAN (e.g. `http://192.168.8.3:6892`).

**Site domain (admin)**

| Field | Example |
| ----- | ------- |
| Service type | Reverse proxy |
| Frontend | `admin.pichost.com` |
| Backend | `http://192.168.8.3:6892` |

**Image domain**

| Field | Example |
| ----- | ------- |
| Service type | Reverse proxy |
| Frontend | `image.pichost.com` |
| Backend | `http://192.168.8.3:6892` |

Both rules can point to the same backend; PicHost applies host-based isolation automatically.

## Environment variables (optional)

```env
SITE_BASE_URL=https://admin.example.com
IMAGE_BASE_URL=https://pic.example.com
```

See [Environment variables](./configuration.md).

## Local testing (Windows / macOS)

### 1. Edit hosts

```text
127.0.0.1 admin.pichost.test
127.0.0.1 pic.pichost.test
```

Prefer the `.test` TLD; avoid `.local` where it conflicts with mDNS.

### 2. Start dev server

```bash
npm run dev
```

Dev binds `127.0.0.1:3000` by default. If the hostname resolves but the browser cannot connect, check whether dev is listening on IPv6 `::1` only.

### 3. Configure dual domains

| Field | Example |
| ----- | ------- |
| Site URL | `http://admin.pichost.test:3000` |
| Image URL | `http://pic.pichost.test:3000` |

Always open admin on the **site hostname**, not `localhost` (cookies and Host must match).

### 4. Expected behavior

| URL | Expected |
| --- | -------- |
| `http://admin.pichost.test:3000/` | Admin UI works |
| `http://admin.pichost.test:3000/images/...` or `/2026/08/xxx.webp` | **404** (use image host) |
| `http://pic.pichost.test:3000/` | **404** (image host has no admin) |
| `http://pic.pichost.test:3000/images/...` | Image served |
| `http://localhost:3000/` or `http://127.0.0.1:3000/` | **Admin still loads** (development exception; block unconfigured hosts at proxy in production) |

After upload, copied links should use `pic.pichost.test`; gallery thumbnails should load.

## Notes

- Hostnames must **differ** (same machine, different subdomains is fine)
- Site / image URLs in Settings must **exactly match** proxy `server_name` (including `www` or not)
- No separate static root on the image domain; unlike EasyImages, PicHost isolates in-app
- Single-domain setups can skip separation and use `IMAGE_BASE_URL` or the request host
- When Referer protection is enabled, site and image hosts are whitelisted automatically

For single-domain proxy basics see [Reverse proxy](./reverse-proxy.md). Chinese version: [双域名分离](/guide/domain-separation)

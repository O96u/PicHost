# Reverse proxy

In production, terminate HTTPS with Nginx, Caddy, NPM (Nginx Proxy Manager), or your NAS proxy and forward to PicHost on port **6892**.

## Basics

- Upstream: `http://127.0.0.1:6892` (or host IP)
- Forward: `Host`, `X-Forwarded-Proto` (and `X-Forwarded-For` as needed)
- Body size: Nginx `client_max_body_size 12m` or larger
- Use **HTTPS** on the public edge

## Single domain (Nginx)

Admin, API, and images on one hostname:

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

Optional:

```env
IMAGE_BASE_URL=https://pic.example.com
```

Without `IMAGE_BASE_URL`, PicHost infers the public URL from forwarded headers.

## Dual domains

Both hostnames can fully proxy to the same port; isolation is enforced in PicHost middleware.

See [Dual-domain separation](./domain-separation.md).

## Cloudflare orange cloud

See [Cloudflare deployment](./cloudflare-deployment.md).

| Practice | Notes |
| -------- | ----- |
| **Proxied DNS** | Both admin and image hostnames → origin proxy to `6892`, SSL **Full (strict)** |
| Preferred edge IPs | Compatible; keep **admin → admin**, **img → img** on origin |
| **R2** | Object storage backend in **Storage**; not the same as hosting the app on Pages |
| Origin firewall | Allow only [Cloudflare IPs](https://www.cloudflare.com/ips/); do not expose `6892` publicly |

**Avoid:**

- **Cloudflare Pages** (`*.pages.dev`) or **Workers** (`*.workers.dev`) as a **full-site reverse proxy**, or chaining the image host to `fetch(admin…)` — rewrites Host and bypasses dual-domain isolation ([guide](./cloudflare-deployment.md))
- “Create Worker” from Git on this repo — `node-server` preset is not Workers-ready

## Origin hardening (dual-domain)

Complement PicHost middleware with:

1. **`server_name` allowlist** — site + image hosts only; `default_server` blocks bare IP and unknown Host
2. **Do not expose 6892 on the public Internet** — only local reverse proxy; public 80/443 only
3. **Orange cloud** — origin firewall limited to Cloudflare IP ranges

**From v1.2.2**, when dual-domain is active PicHost also returns **404 at the app layer** for Host values other than the configured site and image names (complementing, not replacing, a default server block). If misconfiguration locks you out, run `docker exec pichost clear-domains` — see [FAQ](./faq.md#admin-404--locked-out-after-dual-domain-setup).

## Caddy

```caddy
pic.example.com {
  reverse_proxy 127.0.0.1:6892
}
```

Add a second site block for the second hostname with the same upstream.

## Caching

Image 404/403 and domain-isolation 404 responses are **no-cache** to avoid sticky CDN errors. Be careful caching API paths behind a CDN.

## See also

- [Environment variables](./configuration.md)
- [Quick start](./getting-started.md)

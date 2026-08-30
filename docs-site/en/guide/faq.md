# FAQ

## Forgot the admin password?

With `docker exec` access:

```bash
docker exec pichost reset-password
docker exec pichost reset-password <username>
```

Local: `npm run reset-password`. See [Quick start](./getting-started.md#forgot-password).

## Why can’t I regenerate the API token in the UI?

`API_UPLOAD_TOKEN` in the environment **locks** the token. Change env and **restart**. See [Environment variables](./configuration.md#api-upload-token).

## Hotlink / Referer errors?

Check the **Referer whitelist** (`ALLOWED_REFERER_HOSTS` or Settings). Referring sites must be listed; PicHost’s own hosts and dual-domain pair are allowed automatically.

## Why can admin load on pages.dev / workers.dev / IP with dual-domain?

**From v1.2.2:** when dual-domain is on, PicHost returns **404** for Host values **other than** the configured site and image hostnames (`localhost` / `127.0.0.1` exempt in development). See [Changelog](./changelog.md#1-2-2-2026-08-30).

If admin still loads:

1. **Dual-domain not active** (image URL set but site URL empty) — neither path split nor third-host blocking applies
2. **Proxy rewrote Host to site hostname** — e.g. Pages/Worker `fetch(admin…)` on the image hostname
3. **Port `6892` exposed publicly** — bypasses Cloudflare and Nginx `server_name`

Fix: configure both URLs in Settings; add a default server block; with orange cloud, allow only CF IPs on origin; do not full-proxy through Pages/Workers. See [Dual-domain separation](./domain-separation.md#middleware-isolation-and-third-hosts), [Cloudflare deployment](./cloudflare-deployment.md), and [Changelog](./changelog.md#1-2-2-2026-08-30).

## Can I deploy PicHost on Cloudflare Workers / Pages?

**Not with the current codebase.** PicHost needs `node-server`, SQLite, `sharp`, and local `data/` — use Docker/VPS. Connecting the repo in “Create Worker” will not deploy successfully.

Recommended: run PicHost on origin; use **proxied DNS** (and optional **R2** storage). Do not full-proxy the app through Pages/Workers.

## Dual-domain: admin works but thumbnails break?

- Verify **IMAGE_BASE_URL** and proxy to the same instance
- Always open admin on the **site hostname**, not mixed with `localhost`
- See [Dual-domain separation](./domain-separation.md)

## Undeletable gallery items after v1.2 upgrade?

Likely **orphan index** rows (no file on disk). Startup sync removes them on restart. See [v1.2 migration](./migration.md#step-2-startup-index-sync-automatic).

## Do I still need `data/blog/` after migration?

After `migrate --apply`, files live under `data/images/blog/`. Remove leftover empty dirs after backup if you like; dirs with non-image files are kept by the CLI.

## Object storage only — run migrate?

No. Skip the CLI; startup sync focuses on local `data/images/` scanning.

## Replace old image URLs in posts?

Use `data/mapping.json` from `migrate` preview. Keys are **storage paths**, not full legacy URLs. See [Migration](./migration.md#urls).

## Skip login during development?

`DEV_BYPASS_ACCESS=true` (local only). Use `/setup` for normal flows.

## Docs vs README?

This **VitePress site** is the full guide; README is a short overview. Online: <https://o96u.github.io/PicHost/>

## What should the GitHub repo About say?

For **main**:

- **Description**: `Lightweight self-hosted image hosting — Docker, multi-user, gallery & API, local disk or S3-compatible storage.`
- **Website**: `https://o96u.github.io/PicHost/` (docs, not a live demo)

Do not claim the app runs on Cloudflare Pages/Workers. The **cloudflare** branch demo is [pic.roven.cc](https://pic.roven.cc).

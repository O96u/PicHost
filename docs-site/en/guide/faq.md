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

Dual-domain isolation only splits paths on the **configured site and image hostnames**. Other Host values (`localhost`, public IP, Cloudflare **Pages** `*.pages.dev`, **Workers** `*.workers.dev`, etc.) are **not blocked today**, so admin may appear on unexpected URLs.

Common cause: **full-site reverse proxy** via Pages/Workers on top of orange-cloud DNS, or an origin that accepts any Host / bare IP.

Fix: use only the two configured domains; add a default `server_name` block; with orange cloud, allow only CF IPs on the origin. See [Security notes](./domain-separation.md#security-notes).

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

# Changelog

Version history and notable changes. The full log is also in the repo root [CHANGELOG.md](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md).

---

## [1.2.4] — 2026-08-31

### Fix

- **Empty referer whitelist still blocked hotlinks**: with no Referer whitelist configured, direct browser access worked but embedded images on blogs/forums returned 403; protection now runs only when a whitelist is configured

## [1.2.3] — 2026-08-30

### Fix

- **Short links + date-based storage**: bare filename URLs (e.g. `https://host/xxx.webp`) no longer map to flat `images/xxx.webp`; SQLite index resolves the full `images/YYYY/MM/xxx.webp` key so thumbnails and short links work again

---

## [1.2.2] — 2026-08-30

> **Restart the service** after upgrading so middleware and API updates take effect.

### Dual-domain settings & Host isolation

#### Fixes

| Issue | Description |
| ----- | ----------- |
| Site URL cleared by mistake | Saving Settings could write an empty `site_base_url` when disabling dual-domain or editing only the image URL |
| Config vs effective URL mixed | `GET /api/settings` used to blend DB values with `request.origin`, confusing the Settings UI |
| Third-host bypass | Unlisted hosts (`pages.dev`, bare IP, old image domains) were not blocked by middleware |

#### Improvements

**Settings API (`GET /api/settings`)**

| Field | Meaning |
| ----- | ------- |
| `siteBaseUrl` / `imageBaseUrl` | **Configured** values (DB → env), no request fallback |
| `effectiveSiteBaseUrl` / `effectiveImageBaseUrl` | **Link generation**, falls back to request origin when unset |
| `runtime.currentOrigin` | Detected access URL (display only, not saved) |
| `runtime.hostRole` | `site` / `image` / `unknown` / `single` |

**Save API (`PATCH /api/settings`)**

- New body field `domainSeparation` (`true` / `false`)
- `domainSeparation: true` requires both URLs with different hostnames
- `domainSeparation: false` allows clearing the site URL
- Without `domainSeparation`, cannot clear `siteBaseUrl` while dual-domain is active

**Settings / setup UI**

- Form uses configured values; “Active” line shows `effective*`
- Shows detected access URL; **no longer** auto-fills `window.location.origin`
- “Use detected URL” button (opt-in)
- Confirmation modal when disabling dual-domain
- Warning when `hostRole === 'unknown'` with dual-domain on

**Host middleware**

- When dual-domain is on, unlisted hosts get **404** at the app layer (all methods)
- `localhost` / `127.0.0.1` exempt in development
- Complements Nginx `default_server` — use both layers in production

#### Docs

- Rewrote [Cloudflare deployment](./cloudflare-deployment.md)
- Updated [Dual-domain separation](./domain-separation.md) for third-host blocking
- Added this changelog page

#### Upgrade notes

- **No** database migration or CLI step
- If the site URL was cleared earlier: re-enter it in **Settings**, or set `SITE_BASE_URL` in env and restart
- Production: match proxy `server_name` to Settings; keep a default server block

---

## [1.2.1] — 2026-08-29

### Added

- Slide puzzle login captcha
- VitePress docs site on GitHub Pages
- `npm run docs:dev` / `docs:build` / `docs:preview`

### Fixed

- Gallery not refreshing after delete on stats page
- Pagination jump with `type="number"` input
- Copy-link format preference not persisting off home route
- Captcha UI alignment

### Improved

- README trimmed; details moved to docs
- Dual-domain docs: unknown Host risk, Cloudflare guide

---

## [1.2.0] — 2026-08-28

### Changed

- All images under `data/images/`; legacy `blog/` / `twikoo/` need migration

### Added

- CLI: `docker exec pichost migrate` / `migrate --apply`
- Startup index sync (disk scan, legacy key normalization, orphan cleanup)

See [v1.2 migration](./migration.md).

---

## [1.1.x] summary

| Version | Highlights |
| ------- | ---------- |
| 1.1.5 | API upload preview fix; file existence check before serve |
| 1.1.4 | Date-based storage paths; site host blocks image URLs |
| 1.1.3 | Dual-domain (`SITE_BASE_URL` / `IMAGE_BASE_URL`); Host middleware |
| 1.1.0 | Multi storage backends (S3 / R2) |

Older entries: [GitHub CHANGELOG](https://github.com/O96u/PicHost/blob/main/CHANGELOG.md).

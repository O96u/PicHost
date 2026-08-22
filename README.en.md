<p align="center">
  <img src="app/assets/image/logo-light.png" alt="PicHost" width="96" />
</p>

<h1 align="center">PicHost</h1>

<p align="center"><strong>Lightweight personal image hosting</strong> · Simple uploads, clean management</p>

<p align="center">Self-hosted / Multi-user / Docker / API / Twikoo · Zero-config setup</p>

<p align="center">
  <a href="https://github.com/O96u/PicHost/blob/main/package.json"><img src="https://img.shields.io/github/package-json/v/O96u/PicHost?style=flat-square&color=22c55e" alt="version" /></a>
  <a href="https://github.com/O96u/PicHost/actions/workflows/ci.yml"><img src="https://github.com/O96u/PicHost/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white" alt="Nuxt 4" />
  <a href="https://hub.docker.com/r/muxui/pichost"><img src="https://img.shields.io/badge/Docker-muxui%2Fpichost-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="README.md">简体中文</a>
</p>

---

## Screenshots

| Login | Upload |
|:---:|:---:|
| ![Login](docs/screenshots/login.png) | ![Upload](docs/screenshots/upload.png) |

| Upload preferences | Stats & gallery |
|:---:|:---:|
| ![Preferences](docs/screenshots/preferences.png) | ![Stats](docs/screenshots/stats.png) |

| Settings | |
|:---:|:---:|
| ![Settings](docs/screenshots/settings.png) | |

## Features

- **Drag, click, or Ctrl+V paste** to upload; admins can use custom `folder` paths
- **Server-side WebP** (sharp), Referer hotlink protection, configurable public base URL
- **Multi-user** — username/password login; optional registration; users see only their images
- **Upload preferences** (card flip UI): client-side compression, auto-copy links, per-user auto-delete
- **Gallery** — browse, search, batch delete; admin sees uploader badges
- **Stats** — upload/delete metrics, folder breakdown; admin sees registered user count
- **API** — global token (admin) + per-user tokens; in-app cURL snippets
- **Twikoo** — `POST /api/index.php` (`image` + `token`)
- **Zero-config Docker** — first-run web wizard, no secrets required upfront

## Quick Start

### Docker (recommended)

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

Default port: **6892**. Open `http://<host>:6892` in your browser and complete the setup wizard.

If you cloned the repo, you can also use `docker compose up -d` (see `docker-compose.yml`).

### Local development

```bash
npm install
cp .env.example .env   # optional
npm run dev
```

Open `http://localhost:3000/setup` to create the admin account. Data defaults to `./data`.

### Legacy migration

If you only had `ADMIN_SECRET` and no user table, log in with the secret once and follow the migration wizard.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4, Vue 3, Nuxt UI 4, Tailwind CSS 4 |
| Backend | Nitro (Node.js), SQLite |
| Images | sharp (WebP transcoding & compression) |
| Auth | Session cookie, scrypt password hashing, API tokens |
| Storage | Local disk (`DATA_DIR`) |
| Deploy | Docker (amd64 / arm64), docker compose |
| Tests | Vitest |

## Environment variables

| Variable | Description |
|----------|-------------|
| `API_UPLOAD_TOKEN` | Global upload token (`Auth-Token` header); can be generated in the API page |
| `ALLOWED_REFERER_HOSTS` | Hotlink allowlist (comma-separated hostnames) |
| `IMAGE_BASE_URL` | Public base URL for image links |
| `WEBP_QUALITY` | Server WebP quality 1–100, default 80 |
| `AUTO_DELETE_DAYS` | Global auto-delete days (0 = off); admin + orphan images only |
| `DATA_DIR` | Data directory, default `/data` (container) or `./data` (local) |
| `ADMIN_SECRET` | Legacy v1.0 migration only |
| `DEV_BYPASS_ACCESS` | Dev only — bypass auth (never in production) |

Environment variables override database settings. See [`.env.example`](.env.example).

## Users & permissions

| Scenario | Auth | Ownership / visibility |
|----------|------|------------------------|
| Web upload | Session | Current user |
| API upload + **user token** | `Auth-Token` | Token owner |
| API upload + **global token** | `Auth-Token` | Admin (`userId` null) |
| Twikoo `/api/index.php` | form `token` | Same as global token |
| Gallery list / search / delete | Session or token | Users: own only; admin: all |
| Direct link `GET /images/...` | None (Referer rules) | Public if URL is known |

Regular users are limited to the `images/` folder; custom `folder` requires admin or global token.

## Storage layout

```
/data
├── pichost.db          # SQLite: users, sessions, settings, logs
├── images/             # Default upload folder
├── blog/               # Example custom folder
└── twikoo/             # Twikoo comment images
```

Pattern: `folder/YYYY/MM/randomId.webp` + `.meta.json`. Back up the entire `/data` directory.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/images/upload` | Upload image |
| GET | `/api/images` | Paginated list |
| DELETE | `/api/images` | Delete one (`key`) |
| POST | `/api/index.php` | Twikoo / EasyImage 2.0 |

Upload example:

```bash
curl -X POST "https://pic.example.com/api/images/upload" \
  -H "Auth-Token: YOUR_TOKEN" \
  -F "folder=blog" \
  -F "image=@./demo.png"
```

Full docs and copyable cURL snippets are on the **API** page after deployment.

## Twikoo

| Setting | Value |
|---------|-------|
| `IMAGE_CDN` | `easyimage` |
| `IMAGE_CDN_URL` | `https://your-domain/api/index.php` |
| `IMAGE_CDN_TOKEN` | Same as `API_UPLOAD_TOKEN` |

## Reverse proxy

- Proxy to port **6892**; HTTPS recommended
- Nginx: `client_max_body_size` ≥ 12m
- Set `IMAGE_BASE_URL` for public access

## Development

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run start        # Run .output
npm run lint         # ESLint
npm run typecheck    # Type check
npm test             # Unit tests
```

## Roadmap

| Version | Plan |
|---------|------|
| **v1.0.1** | Settings version display, mobile upload preferences layout fix (current) |
| **v1.0.0** | Local storage, multi-user, API, Twikoo |
| **v1.1.0** | S3, Cloudflare R2, and more object storage backends |

## License

[MIT](LICENSE)

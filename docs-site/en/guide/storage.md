# Storage

PicHost supports **local disk** and **S3-compatible object storage** (Cloudflare R2, Tencent COS, Alibaba OSS, AWS S3, etc.). Admins manage backends at **Storage** (`/storage`); new uploads go to the **default** backend.

![Storage management](/screenshots/storage.png)

## Layout (local)

```
/data
├── pichost.db          # SQLite: users, sessions, settings, storage_backends, images index
└── images/             # All files when using local backend
```

- New uploads: `images/randomId.webp` or `images/YYYY/MM/randomId.webp` (flat mode in Settings)
- Migrated legacy: `images/blog/...` and similar
- With cloud backends, blobs live in the bucket; index stays in SQLite `images`

All **keys** start with `images/`. The upload API does **not** accept a `folder` parameter.

## Adding a backend

1. Sign in as admin → **Storage** → **Add backend**.
2. Choose **local disk** or **S3-compatible** (R2 / COS / OSS presets).
3. Enter connection details (bucket, endpoint, keys).
4. **Set as default** so new uploads use it.

### Cloudflare R2

| Field | Value |
| ----- | ----- |
| Endpoint | `https://<account_id>.r2.cloudflarestorage.com` |
| Region | `auto` |
| Bucket | Your R2 bucket name |
| Keys | R2 API token access / secret |

The **cloudflare** branch streamlines R2-only deploys; see branch notes on the [docs overview](./index.md).

### Environment variables (optional)

Some installs seed a default S3 backend via `STORAGE_BACKEND=s3`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`. **UI-configured backends live in SQLite** alongside env-based defaults.

## URL modes

| Mode | Behavior |
| ---- | -------- |
| **proxy** | Serve via PicHost (`GET /images/...`) |
| **public** | 302 redirect to bucket/CDN public URL |

Copied links use **IMAGE_BASE_URL**. “Hide folder prefix” may shorten URLs; the server resolves by path or basename.

## Usage & gallery filter

- Per-backend usage on the Storage page
- Gallery filter by backend (admin)

## Backup

Back up `data/images/`, `data/pichost.db`, and bucket objects.

Upgrading from v1.1.x with parallel folders: [v1.2 migration](./migration.md).

## See also

- [Environment variables](./configuration.md)
- [Users & permissions](./users-and-permissions.md)

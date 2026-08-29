# API

PicHost exposes REST endpoints and a Twikoo-compatible upload. After deployment, open the in-app **API** page for your token and copyable cURL snippets.

## Authentication

All REST calls use:

```http
Auth-Token: YOUR_TOKEN
```

| Token type | How to obtain | Notes |
| ---------- | ------------- | ----- |
| **Global** | Admin **API** page or `API_UPLOAD_TOKEN` env | Env wins and blocks UI regenerate |
| **Personal** | Each user’s **API** page | Uploads belong to that user |

Form uploads may use field `token` (Twikoo protocol).

## Endpoints

### 1. Upload images

`POST /api/images/upload`

Upload one or more images via `image`; also accepts `file`, `files`. Stored under `images/`.

```bash
curl -X POST "https://admin.example.com/api/images/upload" \
  -H "Auth-Token: YOUR_TOKEN" \
  -F "image=@./demo.png"
```

### 2. List images

`GET /api/images`

Paginated gallery. `limit` default 20, max 100.

```bash
curl "https://admin.example.com/api/images?limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 3. Search images

`GET /api/images/search`

Search by filename or path; `q` is required.

```bash
curl "https://admin.example.com/api/images/search?q=demo&limit=20&page=1" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 4. Delete image

`DELETE /api/images`

Delete by `key` (storage path, e.g. `images/2026/08/xxx.webp`).

```bash
curl -X DELETE "https://admin.example.com/api/images?key=images/2026/08/xxxx.webp" \
  -H "Auth-Token: YOUR_TOKEN"
```

### 5. Batch delete

`POST /api/images/batch-delete`

JSON body: `{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}`

```bash
curl -X POST "https://admin.example.com/api/images/batch-delete" \
  -H "Auth-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'
```

## Errors

REST responses are JSON with `code` and `message` (`UNAUTHORIZED`, `FORBIDDEN`, `INVALID_REQUEST`, etc.). Twikoo uses EasyImage-compatible JSON.

## Visibility

- User token: list/search/delete own images only
- Admin token: all images
- Global token uploads belong to admin

See [Users & permissions](./users-and-permissions.md).

## Twikoo

`POST /api/index.php` — [Twikoo](./twikoo.md).

## See also

- [Environment variables](./configuration.md)
- [Reverse proxy](./reverse-proxy.md)

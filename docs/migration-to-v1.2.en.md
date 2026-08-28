# v1.2.0 local disk migration guide

From v1.2.0, **all local image files** live under `data/images/`; SQLite `keys` also start with `images/`. Legacy top-level folders next to `images` (e.g. `data/blog/`, `data/twikoo/`) are no longer used.

Migration is **two steps**: run the **CLI** to move files on disk, then let **startup sync** align the SQLite index.

---

## Migrating from other image hosts (EasyImage, Lsky, Chevereto, …)

There is **no** dedicated “pull from URLs” or “import via vendor API” tool. Moving from **legacy PicHost** or **another self-hosted** install uses the same **local file** workflow:

1. Locate the **image files** on the old server (copy the tree, not just the database).
2. Place them under PicHost `data/` as a **top-level folder** next to `images` (any name — it becomes `images/{name}/...`).
3. Run `migrate` / `migrate --apply`, then restart PicHost.

| Source | Typical path on old server | After copy into PicHost |
| ------ | -------------------------- | ----------------------- |
| PicHost v1.1.x | `data/blog/`, `data/twikoo/` | Already under `data/` → run `migrate` |
| EasyImage(s) | `i/` or `upload/` | e.g. `data/easyimage/` → `migrate` |
| Lsky | `public/uploads/` etc. | e.g. `data/lsky/` → `migrate` |
| Chevereto etc. | `images/` or `content/` | e.g. `data/chevereto/` → `migrate` |
| Custom | your folder name | `data/your-folder/` → `migrate` |

The CLI scans **every top-level directory under `data/` except `images`**, not only `blog` / `twikoo`.

**Limits:** files only — accounts, tokens, and old public URLs are not imported. `mapping.json` maps old **storage keys**, not full old-site URLs. For S3/R2-only legacy hosts, sync blobs to `data/…` or attach the bucket in PicHost **Storage** settings.

---

## Layout before and after

### Before (typical v1.1.x)

```
/data
├── pichost.db
├── blog/
│   └── 2026/08/TeKJ2fD6cB6j.webp
├── twikoo/
└── images/
```

Index keys might look like `blog/2026/08/TeKJ2fD6cB6j.webp`.

### After (v1.2.0)

```
/data
├── pichost.db
├── mapping.json
└── images/
    ├── blog/
    │   └── 2026/08/TeKJ2fD6cB6j.webp
    └── twikoo/
```

Index key: `images/blog/2026/08/TeKJ2fD6cB6j.webp`.

---

## Step 1: CLI file migration

Run **before or after** upgrading the image; backup `data/` first.

```bash
docker exec pichost migrate          # preview + mapping.json
docker exec pichost migrate --apply  # move files
```

Local: `npm run migrate` / `npm run migrate -- --apply`.

| Item | Behavior |
| ---- | -------- |
| Scan | Every top-level directory under `data/` **except `images`** |
| Target | `data/images/{original-top-dir}/{relative-path}` |
| Extensions | jpg, jpeg, png, webp, gif, svg, ico |
| Sidecar | `.meta.json` next to an image is moved if present |
| Other files | Not moved; parent directory kept if anything remains |
| Mapping | `data/mapping.json` — old key → new key |

Script: `server/cli/migrate-to-single-images.mjs`.

---

## Step 2: Startup index sync (automatic)

Runs on every start (`npm run dev`, Docker). No manual command.

```text
[INFO] 开始同步图片索引：扫描本地磁盘 ...
[INFO] 磁盘扫描完成：...
[INFO] 开始归一化遗留图片路径 ...
[INFO] 开始校验索引与磁盘一致性，清理无文件的孤儿记录
[INFO] 图片索引同步结束
```

| Step | Purpose |
| ---- | ------- |
| Scan `data/images/` | Insert missing index rows for files on disk |
| Normalize legacy keys | `blog/...` → `images/blog/...` when files are in place |
| Purge orphans | Remove index rows with no file on disk |
| Repair Content-Type | Fix `application/octet-stream` entries |

The CLI only **moves files**. Index alignment runs at startup — **restart** after `migrate --apply`.

---

## Recommended upgrade flow

1. Backup `data/`.
2. `docker exec pichost migrate` — review output and `mapping.json`.
3. `docker exec pichost migrate --apply`.
4. Deploy v1.2.0 and restart.
5. Check logs for successful index sync.
6. Use `mapping.json` to update external URLs if needed.

Skip step 1 if you only use object storage or everything is already under `data/images/`.

---

## URLs

| Old key | `blog/TeKJ2fD6cB6j.webp` |
| New key | `images/blog/TeKJ2fD6cB6j.webp` |

With “hide folder” mode, short URLs like `/TeKJ2fD6cB6j.webp` may still resolve by filename. Use `mapping.json` for bulk replacements.

Chinese version: [migration-to-v1.2.md](migration-to-v1.2.md)

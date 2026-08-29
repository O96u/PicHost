# Quick start

PicHost is a self-hosted image host for NAS, home servers, or VPS. Docker is recommended; the first visit runs a web wizard to create the admin account.

## Try it online

| Branch | Notes |
| ------ | ----- |
| **main** | No public demo — see [screenshots](./index.md#screenshots) or the repository README |
| **cloudflare** | R2-only live demo: [pic.roven.cc](https://pic.roven.cc) |

## Docker (recommended)

```bash
docker run -d \
  --name pichost \
  -p 6892:6892 \
  -v ./data:/data \
  --restart unless-stopped \
  muxui/pichost:latest
```

Default port: **6892**. Open `http://<host>:6892` and complete setup.

If you cloned the repo:

```bash
docker compose up -d
```

See `docker-compose.yml` in the repository.

## First-time setup

1. Open your instance URL (Docker default `http://<host>:6892`).
2. Complete `/setup` with admin username and password.
3. (Optional) Configure site URL, image URL, Referer rules — see [Environment variables](./configuration.md) and [Dual-domain separation](./domain-separation.md).
4. Upload from the home page; admins can open **Storage**, **Settings**, and **API**.

## Sign in

Management pages (upload, stats, settings, etc.) require login. Enter username and password, **drag the slider to align with the gap**, then click **Sign in**.

![Login](/screenshots/login.png)

If registration is enabled, create an account from the register page. Legacy deployments may still use a secret key (see the on-screen hint).

## Forgot password

Requires `docker exec` (server access):

```bash
docker exec pichost reset-password              # admin only when there is exactly one
docker exec pichost reset-password <username> # admin or regular user
```

A random password is printed. Change it after login.

Local dev: `npm run reset-password` or `npm run reset-password -- <username>`

## Upgrading to v1.2.0

If `data/` has legacy top-level folders next to `images` (e.g. `blog/`, `twikoo/`), read the [v1.2 migration guide](./migration.md) first.

Object-storage-only or files already under `data/images/` — pull the new image and restart.

## Next steps

- [Local development](./local-dev.md)
- [Environment variables](./configuration.md)
- [Storage](./storage.md)
- [API](./api.md)

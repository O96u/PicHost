# Users & permissions

PicHost uses role-based access control (RBAC): **admin** and **user**. Enforcement is server-side.

## Role capabilities

| Capability | Admin | User |
| ---------- | :---: | :--: |
| Upload images | ✓ | ✓ |
| Own gallery | ✓ | ✓ |
| All galleries / uploader badges | ✓ | — |
| Storage management (`/storage`) | ✓ | — |
| System settings (`/settings`) | ✓ | — |
| Allow registration | ✓ | — |
| Global API token | ✓ | — |
| Personal API token | ✓ | ✓ |
| Stats (incl. user count) | ✓ | partial |
| Activity log | ✓ | — |

Regular users see **API**, **Stats** in the nav; user menu: **Change password**, **Sign out**.

## Auth scenarios

| Scenario | Auth | Ownership / visibility |
| -------- | ---- | ---------------------- |
| Web upload | Session cookie | Current user |
| API upload + **user token** | `Auth-Token` header | Token owner |
| API upload + **global token** | `Auth-Token` header | Admin (`userId` null) |
| Twikoo `POST /api/index.php` | form `token` | Same as global token |
| Gallery list / search / delete | Session or token | Users: own only; admin: all |
| Direct link `GET /images/...` | None (Referer rules) | Public if URL is known |

## Accounts

- By default only admins create users; **allow registration** is an admin setting
- Passwords hashed with scrypt
- Web login requires a slider captcha (align the thumb with the gap)
- Login rate limiting

## Upload preferences & auto-delete

- **Upload preferences** (home card flip): client compression, auto-copy links, per user
- **Auto-delete**: global (admin) and per-user policies; affects **new uploads after enable** only

## API tokens

| Type | Managed by | Upload owner | Typical use |
| ---- | ---------- | ------------ | ----------- |
| **Global** | Admin (API page) | Admin account | Twikoo, site-wide scripts |
| **Personal** | Each user (API page) | That user | Personal blog, private scripts |

`API_UPLOAD_TOKEN` in env locks the global token — see [Environment variables](./configuration.md).

## See also

- [API](./api.md)
- [Twikoo](./twikoo.md)
- [Storage](./storage.md)

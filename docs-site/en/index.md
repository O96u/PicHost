---
layout: home

hero:
  name: PicHost
  text: Lightweight image hosting
  tagline: Self-hosted · Multi-user · Docker · API · Twikoo · Local disk or object storage
  actions:
    - theme: brand
      text: Quick start
      link: /en/guide/getting-started
    - theme: alt
      text: API reference
      link: /en/guide/api
    - theme: alt
      text: GitHub
      link: https://github.com/O96u/PicHost

features:
  - title: Drag, click, paste
    details: Server-side WebP compression and Referer hotlink protection.
  - title: Multi-backend storage
    details: Local disk plus S3-compatible backends (R2 / COS / OSS / AWS); proxy or public URLs.
  - title: Users & RBAC
    details: Admin and regular users; global and per-user API tokens; gallery scoped by owner.
  - title: Zero-config Docker
    details: First-run web wizard; reset passwords with `docker exec pichost reset-password`.
  - title: Dual-domain separation
    details: One instance, two hostnames, full reverse proxy; middleware enforces isolation.
  - title: Twikoo compatible
    details: "POST /api/index.php follows EasyImage 2.0 for comment systems."
---

# Vultr Marketplace Submission Draft â€” Carphacom Standalone Developer Edition

## Application name

Carphacom Standalone â€” Developer Edition

## Short description

Early root-ready Developer Edition of the Carphacom commerce platform for self-hosted one-click deployment, evaluation, and customization on Vultr.

## Long description

Carphacom Standalone Developer Edition is a self-hosted commerce and storefront stack prepared for Vultr Marketplace deployment. It is intended for developers, partners, and early adopters who want a root-ready Carphacom environment that can be deployed quickly, inspected, customized, and used as a foundation for building commerce features.

This Marketplace image is an early standalone/root-ready version. A newer production launch version is being prepared. Production use requires domain/SSL setup, secret rotation, backups, monitoring, SMTP/payment configuration, and security hardening.

Public product site:

- https://carphacom.com

## Required early-version notice

This is a new early standalone/root-ready **Developer Edition** of Carphacom. A newer production launch version is being prepared. Use this image for early evaluation, partner demos, and root-level self-hosted development.

## Suggested categories/tags

- Ecommerce
- Marketplace
- CMS
- Developer Tools
- Business Applications
- Self-hosted SaaS
- Medusa
- Next.js

## Suggested minimum plan

Verified source/test plan:

- Vultr `vc2-4c-8gb`
- 4 vCPU
- 8 GB RAM
- 160 GB disk
- Ubuntu 24.04 LTS x64

Recommended minimum Marketplace deployment target:

- 4 vCPU
- 8 GB RAM
- 160 GB disk or larger

Light evaluation minimum:

- 2 vCPU
- 4 GB RAM
- 80 GB disk

The smaller size may be slow for builds/admin development.

## Included services

- Nginx
- PostgreSQL 16
- Redis
- Medusa backend
- Next.js storefront
- Next.js admin UI
- Warehouse/digital twin UI
- Warehouse lab UI
- PM2 process manager
- First-boot setup scripts
- Domain/SSL helper
- Verification helper

## User-facing first-login behavior

On first boot, the image should:

1. Generate fresh per-instance secrets.
2. Accept optional customer-provided admin credentials via startup/user-data preseed.
3. Create the Medusa admin user.
4. Configure IP-based routes immediately.
5. Restart PostgreSQL, Redis, PM2 apps, and Nginx.
6. Write setup instructions to `/root/CARPHACOM_FIRST_LOGIN.txt`.

Supported preseed keys:

```text
CARPHACOM_ADMIN_EMAIL
CARPHACOM_ADMIN_PASSWORD
CARPHACOM_DOMAIN
```

If no credentials are provided, the image generates:

```text
admin@carphacom.local
```

with a unique password stored only on the instance in `/root/CARPHACOM_FIRST_LOGIN.txt`.

## Default routes

```text
/                 storefront redirect to /ro
/ro               storefront
/app              admin canonical entry
/app/login        admin login
/admin/           friendly redirect to /app
/backend/health   Medusa health
/warehouse/       warehouse/digital twin
/warehouse-lab/   warehouse lab
/healthz          Marketplace health
```

Note: `/ro/app` is not an admin route and should 404 unless a storefront page is created there.

## Verification evidence from final-test clone

Final-test clone IP:

```text
<instance-ip>
```

Verified:

- Nginx active
- PostgreSQL active
- Redis active
- PM2 apps online
- Storefront `/ro` returns 200
- Admin `/app/login` returns 200
- `/admin/` redirects correctly
- Backend `/backend/health` returns 200
- Warehouse routes return 200
- Database contains seed/demo content:
  - 156 public tables
  - 2439 products
  - 1 region
  - 6 users
- Preseeded admin firstboot path tested successfully

## Marketplace preparation checklist

### Vendor/application profile

- [ ] Create/verify Vultr Marketplace vendor account.
- [ ] Create application profile for `Carphacom Standalone â€” Developer Edition`.
- [ ] Add support/contact URL and email.
- [ ] Add icon/logo and screenshots.
- [ ] Add public docs or landing page link: `https://carphacom.com`.
- [ ] Clearly mark image as early/root-ready Developer Edition.

### Image/snapshot readiness

- [x] Baseline snapshot created from source instance.
- [x] Final-test clone launched with SSH key.
- [x] Corrected `/app` and `/admin/` routes.
- [x] Firstboot generated credentials tested.
- [x] Firstboot preseeded admin credentials tested.
- [x] PostgreSQL/Redis/PM2/Nginx verified.
- [ ] Sanitize candidate instance.
- [ ] Enable firstboot systemd service on sanitized candidate.
- [ ] Shut down candidate cleanly.
- [ ] Create final sanitized Marketplace snapshot.
- [ ] Test final snapshot by deploying a fresh instance.
- [ ] Submit final sanitized snapshot through Vultr Marketplace/vendor portal.

### Security/sanitation requirements

- [ ] Remove shell histories.
- [ ] Remove non-marketplace SSH keys/private keys.
- [ ] Remove deployment API keys, `.env` secrets that must be regenerated, local key files, temporary upload folders.
- [ ] Remove logs/caches/temp files.
- [ ] Ensure app secrets are generated on first boot.
- [ ] Ensure no private/customer data is bundled.
- [ ] Confirm no root password or API key is embedded in files.

## Marketplace submission limitation

Vultr Marketplace publication normally requires the Vultr Marketplace/vendor approval process. The API can create instances and snapshots, but final public Marketplace listing/submission is generally handled through Vultr's Marketplace/vendor portal or partner process.


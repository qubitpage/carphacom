# Carphacom

Carphacom is a robotised commerce platform and self-hosted Developer Edition built on a Medusa backend, PostgreSQL, Redis, Next.js storefront, and a custom admin/operations UI.

This repository is the sanitized public source package for the **Carphacom Standalone — Developer Edition** Vultr Marketplace image.

> Status: early standalone/root-ready Developer Edition. A newer production launch version is being prepared. Production deployments require additional hardening, secrets rotation, SSL, backups, monitoring, and provider configuration.

## Repository layout

```text
admin-panel/                 Custom Carphacom admin/operations UI
medusa-backend/              Medusa v2 backend
nextjs-storefront/           Customer storefront
warehouse/digital-twin UI    Served from the Marketplace image when enabled
database/                    Sanitized schema/demo SQL assets
marketplace/vultr/           Vultr Marketplace docs and first-boot scripts
```

## Verified Marketplace routes

On a fresh Marketplace instance, the first-boot service detects the instance IP and configures:

```text
/                 Storefront root
/ro               Storefront localized route
/app              Admin application
/app/login        Admin login
/admin/           Redirect to /app/login
/backend/health   Medusa backend health
/warehouse/       Warehouse/digital-twin UI
/warehouse-lab/   Warehouse lab UI
/healthz          Nginx health check
```

`/ro/app` is intentionally not an admin route because `/ro` belongs to the storefront locale namespace.

## Minimum requirements

Recommended Vultr Marketplace plan:

```text
Ubuntu 24.04 LTS x64
4 vCPU / 8 GB RAM / 160 GB disk or better
```

Light testing may work on `2 vCPU / 4 GB RAM / 80 GB disk`, but builds and imports can be slow.

## First boot and admin credentials

The Marketplace image includes a one-time first-boot service:

```text
carphacom-firstboot.service
```

It generates per-instance secrets, detects the instance IP, configures Nginx/PM2, and creates the Medusa admin user.

Optional preseed variables:

```text
CARPHACOM_ADMIN_EMAIL
CARPHACOM_ADMIN_PASSWORD
CARPHACOM_DOMAIN
```

Supported preseed files:

```text
/root/carphacom-marketplace.env
/opt/carphacom-marketplace/customer.env
/var/lib/cloud/instance/user-data.txt
```

If no admin password is provided, one is generated and written on the server to:

```text
/root/CARPHACOM_FIRST_LOGIN.txt
```

## Domain and SSL

After DNS `A` record points to the instance IP:

```bash
sudo carphacom-domain-ssl example.com
```

Optional admin subdomain:

```bash
sudo carphacom-domain-ssl example.com admin.example.com
```

## Developer guide

Read:

```text
marketplace/vultr/DEVELOPER_EDITION_GUIDE.md
marketplace/vultr/VULTR_APP_INSTRUCTIONS.md
```

These documents explain paths, services, database access, route fixes, landing-page edits, rebuilds, troubleshooting, and production hardening.

## Local development overview

Each app is a Node project:

```bash
cd medusa-backend && npm install && npm run build
cd ../nextjs-storefront && yarn install && yarn build
cd ../admin-panel && npm install && npm run build
```

Use `.env.example` files as templates. Never commit real `.env` files.

## Security

This repository intentionally excludes:

- API keys
- production `.env` files
- root passwords
- generated Marketplace credentials
- deployment scratch logs
- Vultr/GitHub tokens

Before publishing, run a secret scan and dependency audit. The Marketplace image also needs instance-specific secret rotation on first boot.

## Support

- Website: <https://carphacom.com>
- Support email: <msrusu@qubitpage.com>
- Repository: <https://github.com/qubitpage/carphacom>

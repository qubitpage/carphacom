# Carphacom — Vultr Marketplace App Instructions

## General Information

| Field | Value |
|---|---|
| App Name | Carphacom |
| App Slug | carphacom |
| Repo URL | https://github.com/qubitpage/carphacom |
| Support Email | msrusu@qubitpage.com |
| Support URL | https://carphacom.com |
| Operating System | Ubuntu 24.04 LTS x64 custom Marketplace snapshot |
| Edition | Carphacom Standalone — Developer Edition |

## Description

Carphacom is a self-hosted, robotised e-commerce Developer Edition for Vultr one-click deployment. It includes a seeded Medusa commerce backend, PostgreSQL database, Redis cache, Next.js storefront, Carphacom Back Office / Admin Panel, warehouse/digital-twin interfaces, PM2 process management, Nginx routing, first-boot credential generation, domain/SSL helpers, and verification tools.

This is an early standalone/root-ready Developer Edition. A newer production launch version is being prepared. Production deployments require domain/SSL setup, provider credentials, SMTP/payment configuration, backups, monitoring, firewall review, and security hardening.

## After Deployment

Wait 2–5 minutes after the instance first boots. The first-boot service configures the instance-specific IP address, generates fresh secrets, creates or updates the Medusa admin user, restarts services, and writes first-login instructions.

Open the storefront:

```text
http://YOUR_INSTANCE_IP/ro
```

Open the Carphacom Back Office / Admin Panel:

```text
http://YOUR_INSTANCE_IP/app/login
```

Friendly admin alias:

```text
http://YOUR_INSTANCE_IP/admin/
```

Important: `/ro/app` is not the admin route. `/ro` is the storefront locale namespace; admin is served from `/app/login`.

## First Login Credentials

SSH into the server as root and read:

```bash
cat /root/CARPHACOM_FIRST_LOGIN.txt
```

If no credentials were provided at deployment time, the image generates:

```text
Admin email: admin@carphacom.local
Admin password: unique random password generated on first boot
```

The generated environment file is stored at:

```bash
/opt/carphacom-marketplace/marketplace-generated.env
```

## Optional Deployment Preseed Values

If Vultr Marketplace custom fields or a startup script are available, set these values before first boot:

```bash
CARPHACOM_ADMIN_EMAIL=owner@example.com
CARPHACOM_ADMIN_PASSWORD='replace-with-a-strong-password'
CARPHACOM_DOMAIN=shop.example.com
```

Supported preseed files:

```text
/root/carphacom-marketplace.env
/opt/carphacom-marketplace/customer.env
/var/lib/cloud/instance/user-data.txt
```

If `CARPHACOM_DOMAIN` is set and DNS already points to the instance IP, the domain helper can configure Nginx and SSL.

## Health Check

Run:

```bash
carphacom-verify
```

Expected core routes:

```text
/                 storefront redirect
/ro               storefront
/app/login        Carphacom Back Office / Admin Panel login
/admin/           redirects to /app/login
/backend/health   Medusa backend health
/warehouse/       warehouse/digital twin
/warehouse-lab/   warehouse lab
/healthz          instance health
```

## Set Up a Domain and SSL

Create a DNS A record pointing your domain to the Vultr instance IP:

```text
shop.example.com A YOUR_INSTANCE_IP
```

Then run:

```bash
carphacom-domain-ssl shop.example.com
```

Optional admin subdomain:

```bash
carphacom-domain-ssl shop.example.com admin.shop.example.com
```

The helper validates DNS, updates Nginx, updates app URLs, reloads services, and uses Certbot/Let’s Encrypt when available.

## Services

Carphacom Developer Edition runs:

```text
nginx
postgresql
redis-server
pm2 apps: qubit-backend, qubit-storefront, qubit-admin, qubit-warehouse, qubit-warehouse-lab
```

Useful commands:

```bash
pm2 status
pm2 logs qubit-backend --lines 100
systemctl status nginx postgresql redis-server --no-pager
journalctl -u carphacom-firstboot.service -n 200 --no-pager
```

## Database

Default database:

```text
qubit_store
```

The application database connection is stored in the backend environment file. The first-boot script rotates per-instance secrets and records generated values in:

```bash
/opt/carphacom-marketplace/marketplace-generated.env
```

Do not publish this file publicly.

## Developer Edition Notes

This image is designed for developers to inspect and build on top of Carphacom. See the full developer guide included in the package:

```text
DEVELOPER_EDITION_GUIDE.md
```

Repository:

```text
https://github.com/qubitpage/carphacom
```

Support:

```text
https://carphacom.com
msrusu@qubitpage.com
```

## Marketplace Gallery Images

Gallery images for the Vultr Application Gallery are included in:

```text
marketplace/vultr/gallery/
```

Suggested upload order:

```text
01-carphacom-platform-storefront-800x500.png
02-carphacom-back-office-admin-800x500.png
03-made-with-carphacom-statiiinfotrafic-800x500.png
04-made-with-carphacom-banat-tractor-800x500.png
05-carphacom-platform-routes-800x500.png
```

Gallery meaning:

1. **Carphacom Platform Storefront** — the main public design from `demo.qubitpage.com`.
2. **Carphacom Back Office / Admin Panel** — Carphacom's own admin panel, not Vultr Cockpit.
3. **Made with Carphacom: Statii Info Trafic** — public example site.
4. **Made with Carphacom: Banat Tractor** — public example site.
5. **Carphacom Developer Routes** — storefront/admin/API/warehouse route overview.

Example sites referenced in the gallery:

```text
https://statiiinfotrafic.ro/ro
https://banat-tractor.ro/ro
```

See:

```text
GALLERY_UPLOAD_INSTRUCTIONS.md
```

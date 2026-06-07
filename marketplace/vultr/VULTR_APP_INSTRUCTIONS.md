# Carphacom — Vultr Marketplace App Instructions

## General Information

| Field | Value |
|---|---|
| App Name | Carphacom |
| App Slug | carphacom |
| Repo URL | https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce |
| Support Email | msrusu@qubitpage.com |
| Support URL | https://carphacom.com |
| Operating System | Ubuntu 24.04 LTS x64 custom Marketplace snapshot |
| Edition | Carphacom Standalone — Developer Edition |

## Description

Carphacom is a self-hosted, robotised e-commerce Developer Edition for Vultr one-click deployment. It includes a seeded Medusa commerce backend, PostgreSQL database, Redis cache, Next.js storefront, Next.js admin UI, warehouse/digital-twin interfaces, PM2 process management, Nginx routing, first-boot credential generation, domain/SSL helpers, and verification tools.

This is an early standalone/root-ready Developer Edition. A newer production launch version is being prepared. Production deployments require domain/SSL setup, provider credentials, SMTP/payment configuration, backups, monitoring, firewall review, and security hardening.

## After Deployment

Wait 2–5 minutes after the instance first boots. The first-boot service configures the instance-specific IP address, generates fresh secrets, creates or updates the Medusa admin user, restarts services, and writes first-login instructions.

Open the storefront:

```text
http://YOUR_INSTANCE_IP/ro
```

Open the admin login:

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
/app/login        admin login
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
https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce
```

Support:

```text
https://carphacom.com
msrusu@qubitpage.com
```

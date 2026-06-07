# Carphacom — Vultr Marketplace Developer Edition

Carphacom is a self-hosted, robotised commerce platform for developers. The Vultr Marketplace Developer Edition installs a working Carphacom stack on a single Ubuntu server with a Medusa backend, PostgreSQL, Redis, Next.js storefront, admin UI, warehouse/digital-twin routes, Nginx, PM2 process management, first-boot credential generation, and domain/SSL helper scripts.

This image is intended for evaluation, customization, and building on top of Carphacom. It is an early standalone/root-ready Developer Edition. A production launch version is being prepared and production deployments require additional hardening, backups, monitoring, provider credentials, and security review.

## General Information

| Field | Value |
|---|---|
| App Name | Carphacom |
| Slug | carphacom |
| Edition | Standalone Developer Edition |
| Operating System | Ubuntu 24.04 LTS x64 |
| Support Email | msrusu@qubitpage.com |
| Support URL | https://carphacom.com |
| Source Repository | https://github.com/qubitpage/carphacom |
| Project Repository | https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce |

## Minimum Requirements

Recommended Vultr instance size:

```text
4 vCPU / 8 GB RAM / 160 GB disk or better
```

Light evaluation may work on smaller instances, but builds, imports, and admin operations can be slow:

```text
2 vCPU / 4 GB RAM / 80 GB disk
```

## What Is Installed

The image starts these services automatically:

```text
nginx
postgresql
redis-server
pm2
```

PM2 manages the Carphacom applications:

```text
qubit-backend         Medusa commerce backend
qubit-storefront      customer storefront
qubit-admin           admin/developer UI
qubit-warehouse       warehouse/digital-twin UI
qubit-warehouse-lab   warehouse lab UI
```

## First Boot

After the Vultr instance first starts, wait about 2–5 minutes for the first-boot service to finish.

The first-boot service:

1. Detects the instance public IPv4 address.
2. Generates fresh per-instance secrets.
3. Configures the storefront, admin, backend, and Nginx routes for the instance IP.
4. Creates or updates the Medusa administrator account.
5. Restarts PostgreSQL, Redis, PM2 apps, and Nginx.
6. Writes first-login instructions to the server.

Check first-boot status:

```bash
systemctl status carphacom-firstboot.service --no-pager
journalctl -u carphacom-firstboot.service -n 100 --no-pager
```

## Access the Application

Replace `YOUR_INSTANCE_IP` with the public IP address shown in your Vultr dashboard.

Storefront:

```text
http://YOUR_INSTANCE_IP/ro
```

Admin login:

```text
http://YOUR_INSTANCE_IP/app/login
```

Admin shortcut:

```text
http://YOUR_INSTANCE_IP/admin/
```

Backend health check:

```text
http://YOUR_INSTANCE_IP/backend/health
```

Warehouse interfaces:

```text
http://YOUR_INSTANCE_IP/warehouse/
http://YOUR_INSTANCE_IP/warehouse-lab/
```

Instance health check:

```text
http://YOUR_INSTANCE_IP/healthz
```

Important: `/ro/app` is not an admin route. `/ro` is the storefront locale namespace. The admin UI is served from `/app/login`.

## First Login Credentials

SSH into the instance as root and read the first-login file:

```bash
cat /root/CARPHACOM_FIRST_LOGIN.txt
```

If no admin credentials were provided before first boot, the image creates:

```text
Admin email: admin@carphacom.local
Admin password: unique random password generated on first boot
```

Generated instance values are stored at:

```bash
/opt/carphacom-marketplace/marketplace-generated.env
```

Do not publish this file or commit it to Git. It contains instance-specific secrets.

## Optional Custom Admin Credentials

If Vultr Marketplace custom fields or a Vultr startup script are available, you can preseed credentials before first boot.

Supported keys:

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

Example startup/user-data content:

```bash
CARPHACOM_ADMIN_EMAIL=owner@example.com
CARPHACOM_ADMIN_PASSWORD='replace-with-a-strong-password'
CARPHACOM_DOMAIN=shop.example.com
```

If these values are not provided, Carphacom generates safe defaults and writes them to `/root/CARPHACOM_FIRST_LOGIN.txt`.

## Verify the Installation

Run the built-in verification command:

```bash
carphacom-verify
```

Expected routes:

```text
/                 storefront redirect
/ro               storefront
/app/login        admin login
/admin/           redirect to /app/login
/backend/health   Medusa backend health
/warehouse/       warehouse UI
/warehouse-lab/   warehouse lab UI
/healthz          Nginx health check
```

Check running processes:

```bash
pm2 status
systemctl status nginx postgresql redis-server --no-pager
```

View logs:

```bash
pm2 logs qubit-backend --lines 100
pm2 logs qubit-storefront --lines 100
pm2 logs qubit-admin --lines 100
journalctl -u nginx -n 100 --no-pager
journalctl -u carphacom-firstboot.service -n 200 --no-pager
```

## Configure a Domain and SSL

1. In your DNS provider, create an A record pointing your domain to the Vultr instance IP:

```text
shop.example.com A YOUR_INSTANCE_IP
```

2. Wait for DNS propagation.

3. Run the Carphacom domain/SSL helper:

```bash
carphacom-domain-ssl shop.example.com
```

Optional admin subdomain:

```bash
carphacom-domain-ssl shop.example.com admin.shop.example.com
```

The helper checks DNS, updates Nginx, updates app URLs, restarts PM2 services, reloads Nginx, and uses Certbot/Let’s Encrypt when available.

Verify:

```text
https://shop.example.com/ro
https://shop.example.com/app/login
https://shop.example.com/backend/health
```

## Database Access

Default application database:

```text
qubit_store
```

The backend database connection is stored in the Medusa backend environment file. Generated first-boot values are recorded in:

```bash
/opt/carphacom-marketplace/marketplace-generated.env
```

Connect locally as PostgreSQL superuser:

```bash
sudo -u postgres psql -d qubit_store
```

Example checks:

```sql
\dt
select count(*) from product;
select count(*) from admin_users;
```

Do not expose PostgreSQL to the public internet without firewall, TLS, and credential hardening.

## Developer Paths

Common application paths on the Marketplace image:

```text
/opt/carphacom-marketplace/       Marketplace helper scripts and generated env
/root/CARPHACOM_FIRST_LOGIN.txt   first-login credentials
```

Use `pm2 status` and `pm2 describe <app>` to see exact runtime paths for each app on your instance.

Typical app areas:

```text
Medusa backend       qubit-backend
Storefront           qubit-storefront
Admin UI             qubit-admin
Warehouse UI         qubit-warehouse
Warehouse lab        qubit-warehouse-lab
```

## Edit the Storefront or Landing Page

1. Locate the storefront process:

```bash
pm2 describe qubit-storefront
```

2. Enter the reported working directory.
3. Edit the relevant Next.js page/components.
4. Build and restart:

```bash
npm install
npm run build
pm2 restart qubit-storefront
```

If your storefront uses Yarn instead of npm on the instance, use:

```bash
yarn install
yarn build
pm2 restart qubit-storefront
```

## Edit the Admin UI

1. Locate the admin process:

```bash
pm2 describe qubit-admin
```

2. Enter the reported working directory.
3. Edit admin pages/components.
4. Build and restart:

```bash
npm install
npm run build
pm2 restart qubit-admin
```

Admin URL:

```text
/app/login
```

## Edit the Backend / Medusa

1. Locate the backend process:

```bash
pm2 describe qubit-backend
```

2. Enter the reported working directory.
3. Update Medusa configuration, API routes, services, or workflows.
4. Build and restart:

```bash
npm install
npm run build
pm2 restart qubit-backend
```

Check backend health:

```bash
curl -fsS http://127.0.0.1:9000/health
curl -fsS http://YOUR_INSTANCE_IP/backend/health
```

## Fix Unrouted Pages

If a page returns 404:

1. Confirm the intended public route:

```bash
nginx -T | grep -E "server_name|location|proxy_pass" -n
```

2. Confirm the app is listening locally:

```bash
ss -ltnp | grep -E ':3000|:8000|:9000|:4000|:4001'
pm2 status
```

3. Confirm whether the route belongs to storefront, admin, backend, or warehouse.
4. Update the Nginx route helper or the site config.
5. Test and reload:

```bash
nginx -t
systemctl reload nginx
```

Route ownership:

```text
/ro               storefront
/app/login        admin
/backend/health   backend
/warehouse/       warehouse
/warehouse-lab/   warehouse lab
```

## Troubleshooting

First boot did not finish:

```bash
journalctl -u carphacom-firstboot.service -n 200 --no-pager
systemctl restart carphacom-firstboot.service
```

Storefront is down:

```bash
pm2 logs qubit-storefront --lines 100
pm2 restart qubit-storefront
```

Admin login is down:

```bash
pm2 logs qubit-admin --lines 100
pm2 restart qubit-admin
curl -I http://127.0.0.1:3000/app/login
```

Backend is down:

```bash
pm2 logs qubit-backend --lines 100
pm2 restart qubit-backend
curl -fsS http://127.0.0.1:9000/health
```

Database issues:

```bash
systemctl status postgresql --no-pager
sudo -u postgres psql -d qubit_store -c 'select count(*) from product;'
```

Redis issues:

```bash
systemctl status redis-server --no-pager
redis-cli ping
```

Nginx issues:

```bash
nginx -t
systemctl status nginx --no-pager
journalctl -u nginx -n 100 --no-pager
```

## Production Hardening Checklist

Before using Carphacom in production:

- Set a real domain and HTTPS.
- Rotate all generated passwords and secrets.
- Configure SMTP, payment providers, storage providers, and external integrations.
- Restrict SSH access and use SSH keys.
- Review firewall rules.
- Enable automated PostgreSQL backups.
- Add uptime monitoring and log retention.
- Review all environment files.
- Run dependency audits and application tests.
- Move from Developer Edition defaults to production-grade settings.

## Support

- Product/support URL: https://carphacom.com
- Support email: msrusu@qubitpage.com
- Source repository: https://github.com/qubitpage/carphacom
- Project repository: https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce

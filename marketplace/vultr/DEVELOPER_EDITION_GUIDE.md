# Carphacom Standalone - Developer Edition Guide

**Target:** Vultr Marketplace / One-Click image  
**Edition:** Early standalone/root-ready Developer Edition  
**Product:** https://carphacom.com  
**Important:** A newer production launch version is being prepared. This image is for evaluation, partner demos, and developers who want to build on top of Carphacom.

---

## 1. Tested status

Final test clone:

```text
IP: <instance-ip>
OS: Ubuntu 24.04.4 LTS
Vultr plan class: 4 vCPU / 8 GB RAM / 160 GB disk
```

Verified public routes:

```text
/                 -> 200 after redirect to /ro
/ro               -> 200 storefront
/app              -> 200 after redirect to /app/login
/app/login        -> 200 admin login
/admin/           -> redirects to /app and loads admin login
/backend/health   -> 200 Medusa health
/warehouse/       -> 200 warehouse/digital twin
/warehouse-lab/   -> 200 lab UI
/healthz          -> 200 Marketplace health
/ro/app           -> 404 expected; admin is NOT inside the storefront locale route
```

Verified database/content:

```text
Database: qubit_store
Public tables: 156
Products: 2439
Regions: 1
Sales channels: 1
Admin/user records: present
```

---

## 2. Minimum requirements

Recommended for Marketplace Developer Edition:

```text
4 vCPU / 8 GB RAM / 160 GB disk or better
```

Light testing minimum:

```text
2 vCPU / 4 GB RAM / 80 GB disk
```

Production starting point:

```text
4-8+ vCPU / 16+ GB RAM / 160+ GB SSD/NVMe
```

Production also needs SSL, backups, mail/payment providers, rotated secrets, monitoring, firewall review, and domain-specific CORS.

---

## 3. Included stack

The image contains:

- Nginx reverse proxy
- PostgreSQL 16
- Redis
- Medusa backend
- Next.js storefront
- Next.js admin UI
- Carphacom warehouse/digital-twin UI
- Warehouse lab UI
- PM2 process manager
- First-boot setup service
- Domain + SSL helper
- Verification helper
- Seed/demo data for developer evaluation

Important paths:

```text
/var/www/demo.qubitpage.com/backend                 Medusa backend
/var/www/demo.qubitpage.com/storefront              Next.js storefront
/var/www/demo.qubitpage.com/admin                   Next.js admin UI
/var/www/demo.qubitpage.com/warehouse-orchestrator  warehouse/digital twin
/var/www/demo.qubitpage.com/warehouse-lab           warehouse lab
/opt/carphacom-marketplace                          Marketplace scripts/config
/root/CARPHACOM_FIRST_LOGIN.txt                     first login instructions after first boot
```

PM2 apps:

```bash
pm2 list
```

Expected apps:

```text
qubit-backend
qubit-storefront
qubit-admin
qubit-warehouse
qubit-warehouse-lab
```

Internal ports:

```text
Admin UI:        127.0.0.1:3000
Storefront:      127.0.0.1:8000
Medusa backend:  127.0.0.1:9000
Warehouse:       127.0.0.1/0.0.0.0:4000
Warehouse lab:   127.0.0.1/0.0.0.0:4001
PostgreSQL:      127.0.0.1:5432
Redis:           127.0.0.1:6379
```

---

## 4. One-click first boot

The final Marketplace image must enable:

```text
carphacom-firstboot.service
```

Installer script for the final candidate image:

```bash
cd /opt/carphacom-marketplace
bash scripts/install-firstboot-service.sh
```

The service runs once, then creates:

```text
/opt/carphacom-marketplace/.firstboot-complete
```

First boot performs:

1. Detects public IP.
2. Generates fresh per-instance app secrets.
3. Sets default IP-based URLs.
4. Installs the Marketplace Nginx default route.
5. Creates/updates the Medusa admin user.
6. Restarts PostgreSQL, Redis, PM2 apps, and Nginx.
7. Writes first-login instructions.

First login file:

```bash
cat /root/CARPHACOM_FIRST_LOGIN.txt
```

Generated secret file:

```bash
cat /opt/carphacom-marketplace/marketplace-generated.env
```

Do not share those generated values.

---

## 5. Admin username/password at one-click deployment

Vultr Marketplace may not expose custom form fields for every third-party app. To support both Marketplace and custom startup-script flows, first boot supports preseed variables.

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

Example startup script / cloud-init payload:

```bash
cat >/root/carphacom-marketplace.env <<'EOF'
CARPHACOM_ADMIN_EMAIL=owner@example.com
CARPHACOM_ADMIN_PASSWORD=Use-A-Long-Random-Password-Here
# Optional, only if DNS already points to the instance:
# CARPHACOM_DOMAIN=shop.example.com
EOF
chmod 600 /root/carphacom-marketplace.env
```

Rules:

- password must be at least 12 characters
- email must be valid
- if omitted, the system generates a random password
- the Medusa admin user is created during first boot

Admin URL:

```text
http://SERVER_IP/app
```

Friendly alias:

```text
http://SERVER_IP/admin/
```

Do not use `/ro/app`; `/ro` is the storefront locale namespace.

---

## 6. Default routes and fixing unrouted pages

The Marketplace Nginx route is installed by:

```bash
/opt/carphacom-marketplace/install-marketplace-default-route.sh
```

Nginx config target:

```text
/etc/nginx/sites-available/carphacom-marketplace-ip.conf
/etc/nginx/sites-enabled/000-carphacom-marketplace-ip.conf
```

Route ownership:

```text
/                  storefront -> 127.0.0.1:8000
/ro                storefront locale
/app               admin -> 127.0.0.1:3000/app
/app/*             admin -> 127.0.0.1:3000
/admin/            redirect to /app
/backend/*         Medusa -> 127.0.0.1:9000
/warehouse/*       warehouse -> 127.0.0.1:4000
/warehouse-lab/*   warehouse lab -> 127.0.0.1:4001
/healthz           Nginx health
```

If a page is unrouted:

1. Confirm which app should own the path.
2. Check the Nginx route:

```bash
nginx -T | grep -nE 'location|server_name|proxy_pass' | less
```

3. Check the app route exists in the source tree.
4. Rebuild the app if source changed.
5. Restart PM2 and reload Nginx.

Common issue:

```text
/ro/app 404
```

This is expected unless you intentionally create a storefront page at `/ro/app`. Admin is `/app`.

---

## 7. Domain and SSL

### DNS

Create an A record pointing to the Vultr instance IP:

```text
Type: A
Name: @ or subdomain
Value: SERVER_IP
TTL: 300 or Auto
```

Example:

```text
shop.example.com -> SERVER_IP
```

Check DNS:

```bash
dig +short shop.example.com
```

### Configure domain + SSL

Run:

```bash
carphacom-domain-ssl shop.example.com
```

or:

```bash
/opt/carphacom-marketplace/carphacom-domain-ssl.sh shop.example.com
```

Optional admin subdomain:

```bash
carphacom-domain-ssl shop.example.com admin.shop.example.com
```

The helper:

- validates DNS points to the instance
- writes Nginx domain config
- attempts Let's Encrypt with Certbot if available
- updates app URLs
- reloads Nginx
- restarts PM2

If DNS is not ready, run the command again later.

---

## 8. Database, passwords, and how to connect

Main database:

```text
qubit_store
```

Main backend env file:

```text
/var/www/demo.qubitpage.com/backend/.env
```

The database password is inside:

```text
DATABASE_URL=postgres://...
```

Show it redacted:

```bash
grep '^DATABASE_URL=' /var/www/demo.qubitpage.com/backend/.env | sed -E 's#://([^:]+):[^@]+@#://\1:<redacted>@#'
```

Connect:

```bash
cd /var/www/demo.qubitpage.com/backend
set -a
source .env
set +a
psql "$DATABASE_URL"
```

Useful SQL:

```sql
select count(*) from product;
select count(*) from region;
select count(*) from sales_channel;
select count(*) from "user";
\dt
```

Backup:

```bash
cd /var/www/demo.qubitpage.com/backend
set -a; source .env; set +a
pg_dump "$DATABASE_URL" > /root/carphacom-db-$(date -u +%Y%m%dT%H%M%SZ).sql
```

Restore:

```bash
cd /var/www/demo.qubitpage.com/backend
set -a; source .env; set +a
psql "$DATABASE_URL" < /root/carphacom-db-backup.sql
```

Redis settings are also in environment files where used. Generated first-boot secrets are in:

```text
/opt/carphacom-marketplace/marketplace-generated.env
```

---

## 9. Start, stop, restart, and logs

Service state:

```bash
systemctl status nginx postgresql redis-server --no-pager
pm2 list
```

Restart everything:

```bash
systemctl restart postgresql@16-main.service 2>/dev/null || systemctl restart postgresql
systemctl restart redis-server
pm2 restart qubit-backend qubit-storefront qubit-admin qubit-warehouse qubit-warehouse-lab
systemctl reload nginx
```

Logs:

```bash
pm2 logs qubit-backend --lines 100
pm2 logs qubit-storefront --lines 100
pm2 logs qubit-admin --lines 100
journalctl -u nginx -n 100 --no-pager
journalctl -u carphacom-firstboot.service -n 200 --no-pager
```

Verification:

```bash
carphacom-verify http://SERVER_IP
```

or:

```bash
/opt/carphacom-marketplace/verify-carphacom.sh http://SERVER_IP
```

---

## 10. How to modify the platform

### Storefront / landing page

Root:

```bash
cd /var/www/demo.qubitpage.com/storefront
```

Find landing routes:

```bash
find . -maxdepth 5 -iname 'page.tsx' -o -iname 'page.jsx' -o -iname 'page.ts'
```

Likely locale storefront route:

```text
/ro
```

After edits:

```bash
cd /var/www/demo.qubitpage.com/storefront
npm install
npm run build
pm2 restart qubit-storefront
```

### Admin UI

Root:

```bash
cd /var/www/demo.qubitpage.com/admin
```

Canonical public route:

```text
/app
```

After edits:

```bash
npm install
npm run build
pm2 restart qubit-admin
```

### Medusa backend

Root:

```bash
cd /var/www/demo.qubitpage.com/backend
```

After backend changes:

```bash
npm install
npm run build
pm2 restart qubit-backend
curl http://127.0.0.1:9000/health
```

### Warehouse / digital twin

Roots:

```bash
/var/www/demo.qubitpage.com/warehouse-orchestrator
/var/www/demo.qubitpage.com/warehouse-lab
```

Restart:

```bash
pm2 restart qubit-warehouse qubit-warehouse-lab
```

---

## 11. How to add new features safely

Recommended developer workflow:

1. SSH into the instance.
2. Create a backup/snapshot first.
3. Edit one app at a time.
4. Run build before restart.
5. Restart only that PM2 app.
6. Verify public route.
7. Commit changes in your own Git repository.

Example:

```bash
cd /var/www/demo.qubitpage.com/storefront
cp -a . /root/storefront-backup-$(date -u +%Y%m%dT%H%M%SZ)
npm run build
pm2 restart qubit-storefront
curl -I http://127.0.0.1:8000/ro
```

Do not edit generated `.next` output directly. Edit source files and rebuild.

---

## 12. Troubleshooting

### Admin page 404

Use:

```text
/app
```

not:

```text
/ro/app
```

Check admin app:

```bash
curl -I http://127.0.0.1:3000/app
pm2 logs qubit-admin --lines 100
nginx -T | grep -n '/app'
```

### Storefront not loading

```bash
curl -I http://127.0.0.1:8000/ro
pm2 logs qubit-storefront --lines 100
```

### Backend unhealthy

```bash
curl http://127.0.0.1:9000/health
pm2 logs qubit-backend --lines 100
cd /var/www/demo.qubitpage.com/backend && source .env && psql "$DATABASE_URL" -c 'select 1;'
```

### Nginx route errors

```bash
nginx -t
nginx -T | less
systemctl reload nginx
```

### First boot did not run

```bash
systemctl status carphacom-firstboot.service --no-pager
journalctl -u carphacom-firstboot.service -n 200 --no-pager
ls -la /opt/carphacom-marketplace
```

To rerun on a test instance only:

```bash
rm -f /opt/carphacom-marketplace/.firstboot-complete
systemctl start carphacom-firstboot.service
```

Do not rerun blindly on production because it can rotate secrets and admin credentials.

---

## 13. Final Marketplace publisher checklist

Before creating the final Marketplace snapshot:

1. Install all scripts into `/opt/carphacom-marketplace`.
2. Run `install-firstboot-service.sh`.
3. Ensure `carphacom-firstboot.service` is enabled.
4. Remove `/opt/carphacom-marketplace/.firstboot-complete` if it exists.
5. Remove `/root/CARPHACOM_FIRST_LOGIN.txt` and generated env files from the candidate.
6. Run cleanup script on candidate only.
7. Remove logs, shell history, temporary files, old SSH keys, and live secrets.
8. Shut down cleanly.
9. Snapshot the sanitized candidate.
10. Launch a fresh instance from that final snapshot.
11. Verify first boot runs automatically.
12. Verify generated/preseeded admin login.
13. Verify storefront, admin, backend, warehouse, database, and SSL helper.
14. Submit that final sanitized snapshot to Vultr Marketplace.

Do not submit the live demo baseline snapshot directly.


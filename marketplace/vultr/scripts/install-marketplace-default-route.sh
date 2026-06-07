#!/usr/bin/env bash
set -euo pipefail

# Installs the Carphacom Developer Edition default HTTP route.
# This makes a newly deployed Vultr instance usable by IP immediately.

NGINX_AVAILABLE=/etc/nginx/sites-available/carphacom-marketplace-ip.conf
NGINX_ENABLED=/etc/nginx/sites-enabled/000-carphacom-marketplace-ip.conf

cat >"$NGINX_AVAILABLE" <<'NGINX'
# Carphacom Developer Edition Marketplace default HTTP route.
# Safe for first boot: works by instance IP before the customer configures DNS/SSL.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 64m;

    add_header X-Carphacom-Edition "Developer" always;
    add_header X-Carphacom-Marketplace "vultr" always;

    location = /healthz {
        access_log off;
        return 200 "carphacom-marketplace-ok\n";
    }

    # Carphacom Admin UI. The current admin build uses Next.js basePath /app.
    # Keep /admin/ as a friendly alias, but serve the canonical app at /app
    # without forcing a trailing slash. Forcing /app/ creates a loop because
    # this admin build canonicalizes /app/ back to /app.
    location = /admin { return 302 /app; }
    location /admin/ { return 302 /app; }
    location = /app {
        proxy_pass http://127.0.0.1:3000/app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    location ^~ /app/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Medusa Backend API, namespaced for same-origin developer use.
    location /backend/ {
        rewrite ^/backend/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /warehouse { return 302 /warehouse/; }
    location /warehouse/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = /warehouse-lab { return 302 /warehouse-lab/; }
    location /warehouse-lab/ {
        proxy_pass http://127.0.0.1:4001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Storefront. Existing Next.js app redirects / -> /ro.
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINX

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx

echo "Installed Carphacom Marketplace default route. Test: curl http://127.0.0.1/healthz"

#!/usr/bin/env bash
set -euo pipefail

# Configure a domain and Let's Encrypt SSL for Carphacom Developer Edition.
# Usage:
#   sudo carphacom-domain-ssl example.com [admin.example.com]
# If the optional admin subdomain is omitted, admin remains at https://example.com/app.

DOMAIN="${1:-}"
ADMIN_DOMAIN="${2:-}"
APP_ROOT=/var/www/demo.qubitpage.com
CONF=/etc/nginx/sites-available/carphacom-domain.conf
ENABLED=/etc/nginx/sites-enabled/001-carphacom-domain.conf
EMAIL="admin@${DOMAIN:-example.com}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo carphacom-domain-ssl <domain> [admin-domain]" >&2
  exit 2
fi

if ! command -v dig >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y dnsutils
fi

PUBLIC_IP="$(curl -fsS --max-time 4 http://169.254.169.254/v1/interfaces/public/0/ipv4/address 2>/dev/null || hostname -I | awk '{print $1}')"
DOMAIN_IP="$(dig +short A "$DOMAIN" | tail -n1 || true)"
if [[ "$DOMAIN_IP" != "$PUBLIC_IP" ]]; then
  echo "ERROR: $DOMAIN A record resolves to '$DOMAIN_IP', expected this instance IP '$PUBLIC_IP'." >&2
  echo "Create/update DNS first, then retry." >&2
  exit 3
fi

SERVER_NAMES="$DOMAIN"
if [[ -n "$ADMIN_DOMAIN" ]]; then
  ADMIN_IP="$(dig +short A "$ADMIN_DOMAIN" | tail -n1 || true)"
  if [[ "$ADMIN_IP" != "$PUBLIC_IP" ]]; then
    echo "ERROR: $ADMIN_DOMAIN A record resolves to '$ADMIN_IP', expected '$PUBLIC_IP'." >&2
    exit 3
  fi
  SERVER_NAMES="$SERVER_NAMES $ADMIN_DOMAIN"
fi

cat >"$CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;
    client_max_body_size 64m;

    add_header X-Carphacom-Edition "Developer" always;

    location = /healthz { access_log off; return 200 "carphacom-domain-ok\n"; }

    # Carphacom Admin UI. The current admin build uses Next.js basePath /app.
    # Keep /admin as a friendly alias, but serve the canonical app at /app
    # without forcing a trailing slash. Forcing /app/ creates a loop because
    # this admin build canonicalizes /app/ back to /app.
    location = /admin { return 302 /app; }
    location /admin/ { return 302 /app; }
    location = /app {
        proxy_pass http://127.0.0.1:3000/app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    location ^~ /app/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location /backend/ {
        rewrite ^/backend/(.*)\$ /\$1 break;
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /warehouse { return 302 /warehouse/; }
    location /warehouse/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = /warehouse-lab { return 302 /warehouse-lab/; }
    location /warehouse-lab/ {
        proxy_pass http://127.0.0.1:4001/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINX

ln -sf "$CONF" "$ENABLED"
nginx -t
systemctl reload nginx

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

CERTBOT_DOMAINS=(-d "$DOMAIN")
if [[ -n "$ADMIN_DOMAIN" ]]; then CERTBOT_DOMAINS+=(-d "$ADMIN_DOMAIN"); fi
certbot --nginx --non-interactive --agree-tos --redirect --email "$EMAIL" "${CERTBOT_DOMAINS[@]}"

# Domain-aware app env hints. Rebuilds may be required for hardcoded Next public env in production.
BASE_URL="https://$DOMAIN"
if [[ -f "$APP_ROOT/backend/.env" ]]; then
  grep -q '^STORE_CORS=' "$APP_ROOT/backend/.env" && sed -i "s|^STORE_CORS=.*|STORE_CORS=$BASE_URL|" "$APP_ROOT/backend/.env" || echo "STORE_CORS=$BASE_URL" >> "$APP_ROOT/backend/.env"
  grep -q '^ADMIN_CORS=' "$APP_ROOT/backend/.env" && sed -i "s|^ADMIN_CORS=.*|ADMIN_CORS=$BASE_URL|" "$APP_ROOT/backend/.env" || echo "ADMIN_CORS=$BASE_URL" >> "$APP_ROOT/backend/.env"
fi
if [[ -f "$APP_ROOT/storefront/.env" ]]; then
  grep -q '^NEXT_PUBLIC_BASE_URL=' "$APP_ROOT/storefront/.env" && sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=$BASE_URL|" "$APP_ROOT/storefront/.env" || echo "NEXT_PUBLIC_BASE_URL=$BASE_URL" >> "$APP_ROOT/storefront/.env"
  grep -q '^NEXT_PUBLIC_MEDUSA_BACKEND_URL=' "$APP_ROOT/storefront/.env" && sed -i "s|^NEXT_PUBLIC_MEDUSA_BACKEND_URL=.*|NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend|" "$APP_ROOT/storefront/.env" || echo "NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend" >> "$APP_ROOT/storefront/.env"
fi

pm2 restart all || true
pm2 save || true
systemctl reload nginx

echo "Domain/SSL configured. Test: https://$DOMAIN/healthz and https://$DOMAIN/ro"

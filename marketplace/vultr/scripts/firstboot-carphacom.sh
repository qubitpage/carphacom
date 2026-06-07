#!/usr/bin/env bash
set -euo pipefail

# Carphacom Developer Edition first-boot script for Vultr Marketplace.
# Purpose:
# - Make a fresh one-click instance usable immediately by IP.
# - Generate fresh per-instance secrets and admin credentials.
# - Keep this Developer Edition suitable for evaluation/dev, not hardened production.

MARKET_DIR=/opt/carphacom-marketplace
APP_ROOT=/var/www/demo.qubitpage.com
MARKER="$MARKET_DIR/.firstboot-complete"
INFO=/root/CARPHACOM_FIRST_LOGIN.txt
GENERATED_ENV="$MARKET_DIR/marketplace-generated.env"
DEFAULT_ROUTE_SCRIPT="$MARKET_DIR/install-marketplace-default-route.sh"

if [[ -f "$MARKER" ]]; then
  echo "Carphacom first boot already completed: $MARKER"
  exit 0
fi

mkdir -p "$MARKET_DIR"
chmod 700 "$MARKET_DIR"

rand_hex() { openssl rand -hex "${1:-32}"; }
rand_b64() { openssl rand -base64 "${1:-24}" | tr -d '\n' | tr -d '"`$\\'; }

DB_PASS="$(rand_hex 24)"
REDIS_PASS="$(rand_hex 24)"
JWT_SECRET="$(rand_hex 32)"
COOKIE_SECRET="$(rand_hex 32)"
REVALIDATE_SECRET="$(rand_hex 24)"
INSTANCE_IP="$(curl -fsS --max-time 4 http://169.254.169.254/v1/interfaces/public/0/ipv4/address 2>/dev/null || hostname -I | awk '{print $1}')"

# Optional customer/admin preseed for one-click deployments.
# Vultr Marketplace images cannot reliably present arbitrary UI fields for every app,
# so support the common safe paths below. Customers/providers can drop key=value lines
# before first boot via startup script, cloud-init, or image customization:
#   CARPHACOM_ADMIN_EMAIL=owner@example.com
#   CARPHACOM_ADMIN_PASSWORD='Change-Me-Long-Random-Password'
#   CARPHACOM_DOMAIN=shop.example.com
PRESEED_FILES=(
  /root/carphacom-marketplace.env
  "$MARKET_DIR/customer.env"
  /var/lib/cloud/instance/user-data.txt
)
read_preseed_value() {
  local key="$1" file line value
  for file in "${PRESEED_FILES[@]}"; do
    [[ -f "$file" ]] || continue
    line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" 2>/dev/null | tail -n 1 || true)"
    [[ -n "$line" ]] || continue
    value="${line#*=}"
    value="${value%$'\r'}"
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    printf '%s' "$value"
    return 0
  done
  return 1
}

ADMIN_EMAIL="$(read_preseed_value CARPHACOM_ADMIN_EMAIL || read_preseed_value ADMIN_EMAIL || true)"
ADMIN_PASSWORD="$(read_preseed_value CARPHACOM_ADMIN_PASSWORD || read_preseed_value ADMIN_PASSWORD || true)"
CUSTOM_DOMAIN="$(read_preseed_value CARPHACOM_DOMAIN || read_preseed_value DOMAIN || true)"

if [[ -z "$ADMIN_EMAIL" ]]; then
  ADMIN_EMAIL="admin@carphacom.local"
fi
if ! [[ "$ADMIN_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "Invalid admin email in preseed: $ADMIN_EMAIL" >&2
  exit 2
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  ADMIN_PASSWORD="$(rand_b64 18)"
elif [[ ${#ADMIN_PASSWORD} -lt 12 ]]; then
  echo "CARPHACOM_ADMIN_PASSWORD must be at least 12 characters." >&2
  exit 2
fi

if [[ -n "$CUSTOM_DOMAIN" ]]; then
  BASE_URL="http://${CUSTOM_DOMAIN}"
else
  BASE_URL="http://${INSTANCE_IP}"
fi

cat >"$GENERATED_ENV" <<ENV
# Generated on first boot. Do not bake these values into a Marketplace snapshot.
CARPHACOM_EDITION=Developer
CARPHACOM_DB_PASSWORD=$DB_PASS
CARPHACOM_REDIS_PASSWORD=$REDIS_PASS
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
REVALIDATE_SECRET=$REVALIDATE_SECRET
CARPHACOM_INITIAL_ADMIN_EMAIL=$ADMIN_EMAIL
CARPHACOM_INITIAL_ADMIN_PASSWORD=$ADMIN_PASSWORD
CARPHACOM_DOMAIN=$CUSTOM_DOMAIN
CARPHACOM_BASE_URL=$BASE_URL
ENV
chmod 600 "$GENERATED_ENV"

# Best-effort app env normalization for first IP boot. This does NOT expose secrets.
# The cloned candidate already contains a working PostgreSQL/Redis/Medusa setup; the final
# sanitized image should remove source secrets before snapshot and rely on this script.
if [[ -d "$APP_ROOT" ]]; then
  for env_file in \
    "$APP_ROOT/backend/.env" \
    "$APP_ROOT/storefront/.env" \
    "$APP_ROOT/admin/.env" \
    "$APP_ROOT/warehouse-orchestrator/.env" \
    "$APP_ROOT/warehouse-lab/.env"; do
    [[ -f "$env_file" ]] || continue
    cp -a "$env_file" "$env_file.firstboot.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  done

  # Keep backend API local. Public access goes through Nginx /backend/.
  if [[ -f "$APP_ROOT/backend/.env" ]]; then
    grep -q '^JWT_SECRET=' "$APP_ROOT/backend/.env" && sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$APP_ROOT/backend/.env" || echo "JWT_SECRET=$JWT_SECRET" >> "$APP_ROOT/backend/.env"
    grep -q '^COOKIE_SECRET=' "$APP_ROOT/backend/.env" && sed -i "s|^COOKIE_SECRET=.*|COOKIE_SECRET=$COOKIE_SECRET|" "$APP_ROOT/backend/.env" || echo "COOKIE_SECRET=$COOKIE_SECRET" >> "$APP_ROOT/backend/.env"
    grep -q '^STORE_CORS=' "$APP_ROOT/backend/.env" && sed -i "s|^STORE_CORS=.*|STORE_CORS=$BASE_URL,https://$INSTANCE_IP|" "$APP_ROOT/backend/.env" || echo "STORE_CORS=$BASE_URL,https://$INSTANCE_IP" >> "$APP_ROOT/backend/.env"
    grep -q '^ADMIN_CORS=' "$APP_ROOT/backend/.env" && sed -i "s|^ADMIN_CORS=.*|ADMIN_CORS=$BASE_URL,https://$INSTANCE_IP|" "$APP_ROOT/backend/.env" || echo "ADMIN_CORS=$BASE_URL,https://$INSTANCE_IP" >> "$APP_ROOT/backend/.env"
  fi

  if [[ -f "$APP_ROOT/storefront/.env" ]]; then
    grep -q '^NEXT_PUBLIC_BASE_URL=' "$APP_ROOT/storefront/.env" && sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=$BASE_URL|" "$APP_ROOT/storefront/.env" || echo "NEXT_PUBLIC_BASE_URL=$BASE_URL" >> "$APP_ROOT/storefront/.env"
    grep -q '^NEXT_PUBLIC_MEDUSA_BACKEND_URL=' "$APP_ROOT/storefront/.env" && sed -i "s|^NEXT_PUBLIC_MEDUSA_BACKEND_URL=.*|NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend|" "$APP_ROOT/storefront/.env" || echo "NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend" >> "$APP_ROOT/storefront/.env"
    grep -q '^MEDUSA_BACKEND_URL=' "$APP_ROOT/storefront/.env" && sed -i "s|^MEDUSA_BACKEND_URL=.*|MEDUSA_BACKEND_URL=http://127.0.0.1:9000|" "$APP_ROOT/storefront/.env" || echo "MEDUSA_BACKEND_URL=http://127.0.0.1:9000" >> "$APP_ROOT/storefront/.env"
  fi

  if [[ -f "$APP_ROOT/admin/.env" ]]; then
    grep -q '^MEDUSA_ADMIN_EMAIL=' "$APP_ROOT/admin/.env" && sed -i "s|^MEDUSA_ADMIN_EMAIL=.*|MEDUSA_ADMIN_EMAIL=$ADMIN_EMAIL|" "$APP_ROOT/admin/.env" || echo "MEDUSA_ADMIN_EMAIL=$ADMIN_EMAIL" >> "$APP_ROOT/admin/.env"
    grep -q '^MEDUSA_ADMIN_PASSWORD=' "$APP_ROOT/admin/.env" && sed -i "s|^MEDUSA_ADMIN_PASSWORD=.*|MEDUSA_ADMIN_PASSWORD=$ADMIN_PASSWORD|" "$APP_ROOT/admin/.env" || echo "MEDUSA_ADMIN_PASSWORD=$ADMIN_PASSWORD" >> "$APP_ROOT/admin/.env"
    grep -q '^NEXT_PUBLIC_BASE_URL=' "$APP_ROOT/admin/.env" && sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=$BASE_URL/app|" "$APP_ROOT/admin/.env" || echo "NEXT_PUBLIC_BASE_URL=$BASE_URL/app" >> "$APP_ROOT/admin/.env"
    grep -q '^NEXT_PUBLIC_MEDUSA_BACKEND_URL=' "$APP_ROOT/admin/.env" && sed -i "s|^NEXT_PUBLIC_MEDUSA_BACKEND_URL=.*|NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend|" "$APP_ROOT/admin/.env" || echo "NEXT_PUBLIC_MEDUSA_BACKEND_URL=$BASE_URL/backend" >> "$APP_ROOT/admin/.env"
  fi
fi

# Rotate the local PostgreSQL application password on every fresh Marketplace boot.
# This parses backend/.env DATABASE_URL, updates the URL with DB_PASS, and changes the
# matching PostgreSQL role password. It does not print the new password.
DB_ROTATE_LOG="$MARKET_DIR/db-rotation.log"
if [[ -f "$APP_ROOT/backend/.env" ]] && command -v python3 >/dev/null 2>&1; then
  export BACKEND_ENV="$APP_ROOT/backend/.env"
  export NEW_DB_PASSWORD="$DB_PASS"
  DB_INFO="$(python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse, urlunparse, quote, unquote
import os, shlex, re
path = Path(os.environ['BACKEND_ENV'])
new_password = os.environ['NEW_DB_PASSWORD']
lines = path.read_text(encoding='utf-8', errors='ignore').splitlines()
url = None
idx = None
prefix = ''
for i, line in enumerate(lines):
    match = re.match(r'^(export\s+)?DATABASE_URL\s*=\s*(.*)$', line)
    if match:
        idx = i
        prefix = match.group(1) or ''
        url = match.group(2).strip().strip('"').strip("'")
        break
if not url:
    raise SystemExit(0)
parsed = urlparse(url)
role = unquote(parsed.username or '')
if not role:
    raise SystemExit(0)
host = parsed.hostname or '127.0.0.1'
host_part = f'[{host}]' if ':' in host and not host.startswith('[') else host
if parsed.port:
    host_part = f'{host_part}:{parsed.port}'
new_netloc = f"{quote(role, safe='')}:{quote(new_password, safe='')}@{host_part}"
new_url = urlunparse((parsed.scheme or 'postgresql', new_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
lines[idx] = prefix + 'DATABASE_URL=' + new_url
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
db_name = (parsed.path or '/').lstrip('/').split('?', 1)[0]
print('PG_ROLE=' + shlex.quote(role))
print('PG_DATABASE=' + shlex.quote(db_name))
PY
  )"
  if [[ -n "$DB_INFO" ]]; then
    # shellcheck disable=SC1090
    source <(printf '%s\n' "$DB_INFO")
    if [[ -n "${PG_ROLE:-}" ]]; then
      export PG_ROLE NEW_DB_PASSWORD
      SQL_TEXT="$(python3 - <<'PY'
import os
role = os.environ['PG_ROLE']
password = os.environ['NEW_DB_PASSWORD']
def ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'
def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"
print('ALTER ROLE ' + ident(role) + ' WITH PASSWORD ' + literal(password) + ';')
PY
      )"
      (printf '%s\n' "$SQL_TEXT" | sudo -u postgres psql -v ON_ERROR_STOP=1) >"$DB_ROTATE_LOG" 2>&1 || echo "WARN: PostgreSQL password rotation failed; see $DB_ROTATE_LOG" >&2
      unset SQL_TEXT
      chmod 600 "$DB_ROTATE_LOG" || true
    fi
  fi
fi

# Install default IP route. The final Marketplace image should include this helper.
if [[ -x "$DEFAULT_ROUTE_SCRIPT" ]]; then
  "$DEFAULT_ROUTE_SCRIPT" || true
elif [[ -f /root/install-marketplace-default-route.sh ]]; then
  bash /root/install-marketplace-default-route.sh || true
fi

# Optional domain setup. If CARPHACOM_DOMAIN is preseeded and already points to this
# instance, the helper will configure Nginx and attempt Let's Encrypt automatically.
if [[ -n "$CUSTOM_DOMAIN" ]] && [[ -x "$MARKET_DIR/carphacom-domain-ssl.sh" ]]; then
  "$MARKET_DIR/carphacom-domain-ssl.sh" "$CUSTOM_DOMAIN" || echo "WARN: Domain/SSL setup failed or DNS not propagated yet. Run carphacom-domain-ssl $CUSTOM_DOMAIN later." >&2
fi

# Create the initial Medusa admin user with the generated first-boot password.
# If an image builder intentionally keeps an existing admin user, this command may fail with
# "already exists"; that is non-fatal for Developer Edition but should be reviewed before publishing.
ADMIN_CREATE_LOG="$MARKET_DIR/admin-create.log"
if [[ -d "$APP_ROOT/backend" ]]; then
  (
    cd "$APP_ROOT/backend"
    if command -v npx >/dev/null 2>&1; then
      timeout 90s npx medusa user --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"
    else
      echo "npx not found; skipped medusa admin creation"
      exit 0
    fi
  ) >"$ADMIN_CREATE_LOG" 2>&1 || echo "WARN: Medusa admin creation did not complete; see $ADMIN_CREATE_LOG" >&2
  chmod 600 "$ADMIN_CREATE_LOG" || true
fi

# Grant the generated/admin-preseeded account access to the Carphacom admin panel.
# Medusa's user command creates the auth identity; this local table controls the custom
# Developer Edition admin UI roles/permissions.
ADMIN_ACCESS_LOG="$MARKET_DIR/admin-access.log"
if [[ -f "$APP_ROOT/backend/.env" ]] && command -v python3 >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
  export BACKEND_ENV="$APP_ROOT/backend/.env"
  DB_NAME="$(python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import os, re
path = Path(os.environ['BACKEND_ENV'])
for line in path.read_text(encoding='utf-8', errors='ignore').splitlines():
    m = re.match(r'^(export\s+)?DATABASE_URL\s*=\s*(.*)$', line)
    if not m:
        continue
    value = m.group(2).strip().strip('"').strip("'")
    parsed = urlparse(value)
    print((parsed.path or '/qubit_store').lstrip('/') or 'qubit_store')
    raise SystemExit(0)
print('qubit_store')
PY
)"
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 --set=admin_email="$ADMIN_EMAIL" >"$ADMIN_ACCESS_LOG" 2>&1 <<'SQL' || echo "WARN: Admin panel access upsert failed; see $ADMIN_ACCESS_LOG" >&2
INSERT INTO admin_users (email, first_name, last_name, role, permissions, is_active, created_at, updated_at)
VALUES (:'admin_email', 'Carphacom', 'Admin', 'admin', '["*"]'::jsonb, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  permissions = '["*"]'::jsonb,
  is_active = true,
  updated_at = NOW();
SQL
  chmod 600 "$ADMIN_ACCESS_LOG" || true
fi

# Restart runtime services.
systemctl restart postgresql@16-main.service 2>/dev/null || systemctl restart postgresql || true
systemctl restart redis-server || true
if command -v pm2 >/dev/null 2>&1; then
  pm2 resurrect || true
  pm2 restart qubit-backend qubit-storefront qubit-admin qubit-warehouse qubit-warehouse-lab || pm2 restart all || true
  pm2 save || true
fi
systemctl reload nginx || systemctl restart nginx || true

cat >"$INFO" <<INFO
Carphacom Standalone — Developer Edition
========================================

This is an early standalone/root-ready Developer Edition for Vultr Marketplace.
A newer production launch version is being prepared.

Instance URL:
  $BASE_URL

Main routes:
  Storefront:      $BASE_URL/ro
  Admin UI:        $BASE_URL/app/  (/admin/ redirects here)
  Backend health:  $BASE_URL/backend/health
  Warehouse twin:  $BASE_URL/warehouse/
  Warehouse lab:   $BASE_URL/warehouse-lab/

Initial generated admin credentials:
  Email:    $ADMIN_EMAIL
  Password: $ADMIN_PASSWORD

Generated secrets/env file:
  $GENERATED_ENV

Recommended next steps:
  1. Open the storefront and admin routes above.
  2. Point your domain A record to this instance IP: $INSTANCE_IP
  3. Run: carphacom-domain-ssl YOUR_DOMAIN [ADMIN_SUBDOMAIN]
  4. Log in and change the generated admin password.
  5. Review /var/www/demo.qubitpage.com/*/.env before production.

Security note:
  This Developer Edition is for evaluation/development. Production requires rotated secrets,
  domain-specific CORS, HTTPS, backups, mail provider, payment provider, monitoring, and firewall review.
INFO
chmod 600 "$INFO"

touch "$MARKER"
systemctl disable carphacom-firstboot.service 2>/dev/null || true

echo "Carphacom first-boot setup complete. See $INFO"

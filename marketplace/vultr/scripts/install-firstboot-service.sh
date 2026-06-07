#!/usr/bin/env bash
set -euo pipefail

# Install Carphacom Developer Edition Marketplace scripts and first-boot systemd service.
# Run this on the final candidate instance BEFORE creating the Marketplace snapshot.

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKET_DIR=/opt/carphacom-marketplace
BIN_DIR="$MARKET_DIR/bin"
SERVICE=/etc/systemd/system/carphacom-firstboot.service

install -d -m 700 "$MARKET_DIR" "$BIN_DIR"

install_script() {
  local src="$1"
  local dst="$2"
  if [[ ! -f "$src" ]]; then
    echo "Missing required script: $src" >&2
    exit 1
  fi
  if [[ "$(readlink -f "$src")" != "$(readlink -f "$dst" 2>/dev/null || true)" ]]; then
    install -m 700 "$src" "$dst"
  else
    chmod 700 "$dst"
  fi
}

install_script "$SRC_DIR/firstboot-carphacom.sh" "$MARKET_DIR/firstboot-carphacom.sh"
install_script "$SRC_DIR/install-marketplace-default-route.sh" "$MARKET_DIR/install-marketplace-default-route.sh"
install_script "$SRC_DIR/carphacom-domain-ssl.sh" "$MARKET_DIR/carphacom-domain-ssl.sh"
install_script "$SRC_DIR/verify-carphacom.sh" "$MARKET_DIR/verify-carphacom.sh"

# Compatibility path used by the systemd service and cleanup docs.
ln -sf "$MARKET_DIR/firstboot-carphacom.sh" "$BIN_DIR/firstboot-carphacom.sh"

# Convenient admin commands for the deployed customer.
ln -sf "$MARKET_DIR/firstboot-carphacom.sh" /usr/local/bin/carphacom-firstboot
ln -sf "$MARKET_DIR/carphacom-domain-ssl.sh" /usr/local/bin/carphacom-domain-ssl
ln -sf "$MARKET_DIR/verify-carphacom.sh" /usr/local/bin/carphacom-verify
ln -sf "$MARKET_DIR/install-marketplace-default-route.sh" /usr/local/bin/carphacom-install-default-route

cat >"$SERVICE" <<'SERVICE'
[Unit]
Description=Carphacom Marketplace First Boot Setup
Documentation=file:/opt/carphacom-marketplace/README.txt
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
ConditionPathExists=!/opt/carphacom-marketplace/.firstboot-complete

[Service]
Type=oneshot
ExecStart=/opt/carphacom-marketplace/firstboot-carphacom.sh
RemainAfterExit=yes
TimeoutStartSec=600
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
SERVICE

cat >"$MARKET_DIR/README.txt" <<'README'
Carphacom Standalone — Developer Edition

First login file after first boot:
  /root/CARPHACOM_FIRST_LOGIN.txt

Generated per-instance secrets:
  /opt/carphacom-marketplace/marketplace-generated.env

Commands:
  carphacom-verify [http://host]
  carphacom-domain-ssl your-domain.com [admin.your-domain.com]
  carphacom-install-default-route

Admin route:
  /app

Storefront route:
  /ro
README
chmod 600 "$MARKET_DIR/README.txt"

systemctl daemon-reload
systemctl enable carphacom-firstboot.service

echo "Installed and enabled carphacom-firstboot.service"
echo "The service will run once on next boot unless $MARKET_DIR/.firstboot-complete already exists."

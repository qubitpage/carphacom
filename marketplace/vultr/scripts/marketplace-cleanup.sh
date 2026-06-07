#!/usr/bin/env bash
set -euo pipefail

# Carphacom Marketplace candidate cleanup script.
# Run this ONLY on a temporary candidate instance created from the baseline snapshot,
# not on the live demo server.

if [[ "${1:-}" != "--i-understand-this-is-a-candidate" ]]; then
  echo "Refusing to run without confirmation."
  echo "Usage: sudo bash marketplace-cleanup.sh --i-understand-this-is-a-candidate"
  exit 2
fi

export DEBIAN_FRONTEND=noninteractive

mkdir -p /opt/carphacom-marketplace
chmod 700 /opt/carphacom-marketplace

# Stop application processes before sanitizing candidate state.
pm2 save || true
pm2 stop all || true
systemctl stop nginx || true

# Remove temporary/deployment artifacts commonly left behind.
rm -rf /tmp/* /var/tmp/* || true
rm -rf /root/.cache /home/*/.cache || true
rm -rf /root/.npm /home/*/.npm || true
rm -rf /tmp/carphacom_upload /root/carphacom_upload || true

# Clear logs while preserving files/directories.
find /var/log -type f -exec truncate -s 0 {} \; 2>/dev/null || true
journalctl --rotate || true
journalctl --vacuum-time=1s || true

# Remove shell histories.
rm -f /root/.bash_history /root/.zsh_history /root/.mysql_history /root/.psql_history || true
find /home -maxdepth 2 -type f \( -name '.bash_history' -o -name '.zsh_history' -o -name '.mysql_history' -o -name '.psql_history' \) -delete 2>/dev/null || true
unset HISTFILE || true

# Remove machine-specific SSH host keys so cloud-init/regeneration can recreate them if desired.
# Uncomment only if Vultr Marketplace validation expects regenerated host keys.
# rm -f /etc/ssh/ssh_host_*key /etc/ssh/ssh_host_*key.pub

# Remove root authorized keys from the candidate image unless Marketplace requires a retained vendor key.
# Vultr injects user SSH keys at deployment time.
rm -f /root/.ssh/authorized_keys || true

# Remove all machine-specific first-boot output so every new Vultr one-click deployment
# detects its own public IP and generates its own secrets/admin password.
rm -f /opt/carphacom-marketplace/.firstboot-complete || true
rm -f /opt/carphacom-marketplace/marketplace-generated.env || true
rm -f /opt/carphacom-marketplace/db-rotation.log || true
rm -f /root/CARPHACOM_FIRST_LOGIN.txt || true
rm -f /root/carphacom-marketplace.env || true
rm -f /opt/carphacom-marketplace/customer.env || true
find /var/www/demo.qubitpage.com -type f -name '*.firstboot.bak.*' -delete 2>/dev/null || true

# Reset service state; the final image must run first boot on the customer's first boot.
systemctl reset-failed carphacom-firstboot.service 2>/dev/null || true
systemctl disable carphacom-firstboot.service 2>/dev/null || true

# Prepare first-boot script location. Copy firstboot-carphacom.sh here before enabling the service.
mkdir -p /opt/carphacom-marketplace/bin
chmod 700 /opt/carphacom-marketplace/bin

cat >/etc/systemd/system/carphacom-firstboot.service <<'SERVICE'
[Unit]
Description=Carphacom Marketplace First Boot Setup
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
ConditionPathExists=!/opt/carphacom-marketplace/.firstboot-complete

[Service]
Type=oneshot
ExecStart=/opt/carphacom-marketplace/bin/firstboot-carphacom.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable carphacom-firstboot.service

# Clear cloud-init machine identity when appropriate.
cloud-init clean --logs || true
truncate -s 0 /etc/machine-id || true
rm -f /var/lib/dbus/machine-id || true
ln -sf /etc/machine-id /var/lib/dbus/machine-id || true

sync

echo "Candidate cleanup complete. Install firstboot-carphacom.sh to /opt/carphacom-marketplace/bin/ before final snapshot."

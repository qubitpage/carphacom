#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
BASE_URL="${BASE_URL%/}"

echo "== Carphacom Developer Edition Marketplace Verification =="
date -u

echo "\n== OS =="
lsb_release -ds 2>/dev/null || cat /etc/os-release

echo "\n== Minimum recommended instance =="
echo "Recommended baseline: 4 vCPU / 8 GB RAM / 160 GB disk (Vultr vc2-4c-8gb or better)"
echo "Developer minimum for light testing: 2 vCPU / 4 GB RAM / 80 GB disk (may be slow)"

echo "\n== CPU/RAM/Disk =="
nproc || true
free -h || true
df -h / /var /opt 2>/dev/null || df -h /

echo "\n== Services =="
for svc in nginx postgresql redis-server; do
  printf '%-16s ' "$svc"
  systemctl is-active "$svc" || true
done

if command -v pm2 >/dev/null 2>&1; then
  echo "\n== PM2 =="
  pm2 list || true
fi

echo "\n== Listening ports =="
ss -tlnp 2>/dev/null | awk 'NR>1{print $4,$6}' | sort || true

echo "\n== Local internal service probes =="
for url in \
  http://127.0.0.1:3000/ \
  http://127.0.0.1:8000/ \
  http://127.0.0.1:9000/health \
  http://127.0.0.1:9000/store/marketplace/health \
  http://127.0.0.1:4000/ \
  http://127.0.0.1:4001/
 do
  code=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 10 "$url" || true)
  echo "$url -> $code"
done

echo "\n== Public/default route probes: $BASE_URL =="
FAIL=0
probe() {
  local path="$1"
  local expected="$2"
  local url="${BASE_URL}${path}"
  local code
  code=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true)
  echo "$url -> $code (expected $expected)"
  case ",$expected," in
    *",$code,"*) ;;
    *) FAIL=1 ;;
  esac
}
probe /healthz 200
probe / 200,301,302,307,308
probe /ro 200
probe /admin/ 200,301,302,307,308
probe /app 200,301,302,307,308
probe /app/login 200,301,302,307,308
probe /backend/health 200
probe /warehouse/ 200
probe /warehouse-lab/ 200

echo "\n== Nginx config test =="
nginx -t

echo "\n== First-login file =="
if [[ -f /root/CARPHACOM_FIRST_LOGIN.txt ]]; then
  echo "Found /root/CARPHACOM_FIRST_LOGIN.txt (not printing generated password)."
else
  echo "Not found yet. Expected only after firstboot-carphacom.sh runs."
fi

echo "\n== Marketplace files =="
ls -la /opt/carphacom-marketplace 2>/dev/null || true

echo "\nVerification complete."
if [[ "$FAIL" -ne 0 ]]; then
  echo "One or more public route probes failed." >&2
  exit 1
fi

#!/usr/bin/env bash
# Qubitpage LIMITED website deploy for the CarphaCom install on qubitpage.com.
# Usage:  bash qubitpage-site.sh [files|build|products|medusa|check|all]   (default: all = files build products check)
# Every changed file is backed up to ~/backups/site-<time>/ first. Nothing is deleted: removed files are moved there too.
set -uo pipefail
STAGE="${1:-all}"
ROOT="${CARPHACOM_ROOT:-$HOME/carphacom}"
BRANCH="${QP_BRANCH:-qubitpage-site}"
TS="$(date +%Y%m%d-%H%M%S)"
BK="$HOME/backups/site-$TS"
LOG="$HOME/qp-deploy.log"
SRC="$HOME/.qp-src"
STATE="$HOME/.qp-deployed"   # hashes of files this script wrote (safe to overwrite next time)
mkdir -p "$BK"
exec > >(tee -a "$LOG") 2>&1
say() { printf '\n== %s ==\n' "$*"; }

fetch_src() {
  say "Downloading branch $BRANCH"
  rm -rf "$SRC" && mkdir -p "$SRC"
  if [ -n "${QP_LOCAL_SRC:-}" ]; then cp -a "$QP_LOCAL_SRC/." "$SRC/"; return; fi
  curl -fsSL "https://codeload.github.com/qubitpage/carphacom/tar.gz/$BRANCH" | tar xz -C "$SRC" --strip-components=1 || { echo "download failed"; exit 1; }
}

blobhash() { python3 - "$1" <<'PY'
import hashlib,sys
d=open(sys.argv[1],'rb').read()
print(hashlib.sha1(b'blob %d\0'%len(d)+d).hexdigest())
PY
}

rebrand() { perl -Mutf8 -CSD -pi -e '
s/infotraficstatii\@gmail\.com/contact\@qubitpage.com/g;
s/www\.statiiinfotrafic\.ro/qubitpage.com/g; s/statiiinfotrafic\.ro/qubitpage.com/g;
s/SC STATII INFO TRAFIC SRL/Qubitpage LIMITED/g;
s/Sta(?:ț|ţ|t)ii ?Info ?Trafic(?:\.ro)?/Qubitpage/gi;' "$1"; }

stage_files() {
  fetch_src
  local man="$SRC/deploy/qubitpage-site.manifest" copied=0 patched=0 moved=0
  [ -f "$man" ] || { echo "manifest missing"; exit 1; }
  say "Applying changes to $ROOT (backup: $BK)"
  while IFS=' ' read -r st hash f; do
    [ -n "$f" ] || continue
    case "$f" in */data/*|*/.env|*/.env.*) echo "skipped (runtime data/secrets): $f"; continue ;; esac
    case "$st" in
      A|M)
        if [ -e "$ROOT/$f" ]; then mkdir -p "$BK/$(dirname "$f")"; cp -a "$ROOT/$f" "$BK/$f"; fi
        cur=""; [ -f "$ROOT/$f" ] && cur="$(blobhash "$ROOT/$f")"
        if [ "$st" = M ] && [ -n "$cur" ] && [ "$cur" != "$hash" ] && ! grep -qxF "$cur $f" "$STATE" "$SRC/deploy/qubitpage-site.prev" 2>/dev/null; then
          rebrand "$ROOT/$f"; patched=$((patched+1)); echo "patched in place (server copy differs): $f"
        else
          mkdir -p "$ROOT/$(dirname "$f")"; cp "$SRC/$f" "$ROOT/$f"; copied=$((copied+1))
          echo "$(blobhash "$ROOT/$f") $f" >> "$STATE"
        fi ;;
      D)
        if [ -e "$ROOT/$f" ]; then mkdir -p "$BK/removed/$(dirname "$f")"; mv "$ROOT/$f" "$BK/removed/$f"; moved=$((moved+1)); fi ;;
    esac
  done < "$man"
  rm -rf "$ROOT/nextjs-storefront/src/app/[countryCode]/test-tiered-pricing" 2>/dev/null
  for d in public/blog public/brands public/products public/uploads public/import-template src/app/test-tiered-pricing; do
    [ -d "$ROOT/nextjs-storefront/$d" ] && find "$ROOT/nextjs-storefront/$d" -depth -type d -empty -delete 2>/dev/null
  done
  echo "copied=$copied patched=$patched moved_to_backup=$moved"
  say "Remaining old brand strings in source (should be none)"
  grep -rIl -i "infotrafic" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.medusa --exclude-dir=.git "$ROOT"/{nextjs-storefront,admin-panel,medusa-backend} 2>/dev/null | grep -v '\.md$' | while read -r x; do rebrand "$x"; echo "rebranded: $x"; done
}

stage_build() {
  say "Storefront build"
  cd "$ROOT/nextjs-storefront" && npm install --no-audit --no-fund --loglevel=error && npm run build && pm2 restart qubit-storefront --update-env || { echo "STOREFRONT BUILD FAILED"; return 1; }
  say "Admin panel build"
  cd "$ROOT/admin-panel" && npm run build && pm2 restart qubit-admin --update-env || { echo "ADMIN BUILD FAILED"; return 1; }
}

dburl() { grep -E '^DATABASE_URL=' "$ROOT/medusa-backend/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"; }

stage_products() {
  local url; url="$(dburl)"; [ -n "$url" ] || { echo "DATABASE_URL not found"; return 1; }
  say "Database backup"
  pg_dump -Fc "$url" -f "$BK/medusa-before-products.dump" && ls -la "$BK/medusa-before-products.dump"
  say "Removing the old radio products, categories and collections (soft delete)"
  psql "$url" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SELECT count(*) AS products_before FROM product WHERE deleted_at IS NULL;
UPDATE product_variant SET deleted_at = now() WHERE deleted_at IS NULL;
UPDATE product SET deleted_at = now() WHERE deleted_at IS NULL;
UPDATE product_category SET deleted_at = now() WHERE deleted_at IS NULL;
UPDATE product_collection SET deleted_at = now() WHERE deleted_at IS NULL;
SELECT count(*) AS products_after FROM product WHERE deleted_at IS NULL;
COMMIT;
SQL
}

stage_medusa() {
  cd "$ROOT/medusa-backend" || return 1
  local cur; cur="$(node -p 'require("@medusajs/medusa/package.json").version' 2>/dev/null)"
  say "Medusa installed: $cur  node: $(node -v)"
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=22)?0:1)' || { echo "Medusa 2.22 needs Node >= 22.22 — upgrade Node first"; return 1; }
  local url; url="$(dburl)"
  pg_dump -Fc "$url" -f "$BK/medusa-before-upgrade.dump" && echo "db backup ok"
  cp package.json "$BK/medusa-package.json"; [ -f package-lock.json ] && cp package-lock.json "$BK/medusa-package-lock.json"
  local pkgs; pkgs="$(node -e 'const p=require("./package.json");const d={...p.dependencies,...p.devDependencies};console.log(Object.keys(d).filter(k=>/^@medusajs\/(medusa|framework|cli|admin-sdk|test-utils|file|js-sdk|types|utils|icons)$/.test(k)).map(k=>k+"@2.22.1").join(" "))')"
  say "npm install $pkgs"
  npm install $pkgs --no-audit --no-fund --loglevel=error || { echo "INSTALL FAILED — restore: cp $BK/medusa-package*.json; npm install"; return 1; }
  npx medusa db:migrate || { echo "MIGRATION FAILED"; return 1; }
  npm run build || { echo "MEDUSA BUILD FAILED"; return 1; }
  [ -f .env ] && [ -d .medusa/server ] && cp .env .medusa/server/.env 2>/dev/null
  pm2 restart qubit-backend --update-env
  sleep 8; echo "now: $(node -p 'require("@medusajs/medusa/package.json").version')"
  curl -s -o /dev/null -w "backend /health %{http_code}\n" http://127.0.0.1:9000/health
}

stage_check() {
  say "Checks"
  sleep 3
  for p in / /projects /projects/carpathron-muse /robotics /about /contact /privacy /robots.txt /sitemap.xml /ro/store /nonexistent; do
    curl -s -o /dev/null -w "storefront %-28{url_effective} %{http_code}\n" "http://127.0.0.1:8000$p"
  done
  curl -s -o /dev/null -w "admin /app %{http_code}\n" http://127.0.0.1:3000/app
  curl -s -o /dev/null -w "backend /health %{http_code}\n" http://127.0.0.1:9000/health
  pm2 ls
}

case "$STAGE" in
  files) stage_files ;; build) stage_build ;; products) stage_products ;; medusa) stage_medusa ;; check) stage_check ;;
  all) stage_files && stage_build && stage_products; stage_check ;;
  *) echo "unknown stage $STAGE"; exit 1 ;;
esac
echo "DONE $STAGE  (log: $LOG, backup: $BK)"

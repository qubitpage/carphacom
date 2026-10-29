#!/usr/bin/env bash
# Rebuild deploy/qubitpage-site.manifest (changes vs origin/main) and .prev (every version earlier deploys wrote).
set -e
cd "$(git rev-parse --show-toplevel)"
DIRS="nextjs-storefront admin-panel medusa-backend"
git diff --cached --name-status origin/main -- $DIRS | grep -v "admin-panel/data/" | while IFS=$'\t' read st f; do
  case $st in A) echo "A - $f";; M) echo "M $(git rev-parse origin/main:"$f") $f";; D) echo "D - $f";; esac
done > deploy/qubitpage-site.manifest
for c in $(git rev-list origin/main..HEAD); do
  git diff --name-only origin/main "$c" -- $DIRS | while read f; do h=$(git rev-parse "$c:$f" 2>/dev/null) && echo "$h $f"; done
done | sort -u > deploy/qubitpage-site.prev
wc -l deploy/qubitpage-site.manifest deploy/qubitpage-site.prev

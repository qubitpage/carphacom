# Carphacom for Vultr Marketplace — Developer Edition

This folder contains the public Marketplace preparation package for **Carphacom Standalone — Developer Edition**.

Carphacom is an early standalone/root-ready Developer Edition for one-click evaluation and self-hosted development on Vultr. A newer production launch version is being prepared.

Public product link:

- <https://carphacom.com>

## Marketplace package files

```text
README.md
marketplace-submission.md
metadata.json
DEVELOPER_EDITION_GUIDE.md
VULTR_MARKETPLACE_FIELDS.md
VULTR_APP_INSTRUCTIONS.md
scripts/firstboot-carphacom.sh
scripts/install-marketplace-default-route.sh
scripts/carphacom-domain-ssl.sh
scripts/marketplace-cleanup.sh
scripts/verify-carphacom.sh
scripts/install-firstboot-service.sh
```

## One-click first boot

For the final Marketplace candidate, install and enable the first-boot service before snapshot:

```bash
cd /opt/carphacom-marketplace
sudo bash scripts/install-firstboot-service.sh
```

`firstboot-carphacom.sh` supports generated credentials and customer-preseeded credentials.

Supported preseed keys:

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

If no admin credentials are provided, first boot generates a unique password and writes it to:

```text
/root/CARPHACOM_FIRST_LOGIN.txt
```

## Expected routes

```text
/                 Storefront root
/ro               Storefront localized route
/app              Admin app
/app/login        Admin login
/admin/           Redirect to /app/login
/backend/health   Medusa backend health
/warehouse/       Warehouse/digital-twin UI
/warehouse-lab/   Warehouse lab UI
/healthz          Nginx health check
```

`/ro/app` is intentionally not the admin route; `/ro` is the storefront locale namespace.

## Important security note

Before any public Marketplace submission, produce a sanitized candidate snapshot:

1. Rotate/remove live passwords and tokens.
2. Remove shell history, logs, caches, temp files, upload artifacts, and local API keys.
3. Replace app secrets with first-boot generated values.
4. Remove first-boot marker files and generated credentials from the snapshot.
5. Ensure no private customer data is bundled.
6. Verify a fresh instance boots and runs without manual repair.

Do **not** submit a live demo machine directly.

## Recommended final workflow

1. Launch a candidate instance from the prepared baseline image.
2. Install/copy scripts from this package into `/opt/carphacom-marketplace`.
3. Enable firstboot as a systemd one-shot service.
4. Run generated-credential firstboot test.
5. Run preseeded admin credential firstboot test.
6. Run `/opt/carphacom-marketplace/verify-carphacom.sh`.
7. Run `scripts/marketplace-cleanup.sh` on the candidate.
8. Shut down cleanly.
9. Create the final sanitized Marketplace snapshot.
10. Launch one fresh instance from the final snapshot.
11. Verify routes, services, DB, admin login, and generated credentials.
12. Submit final sanitized snapshot to Vultr Marketplace/vendor portal.

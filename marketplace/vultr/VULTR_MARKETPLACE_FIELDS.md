# Vultr Marketplace Fields â€” Carphacom

Use these values in the Vultr Marketplace submission form.

## General Information

| Field | Value |
|---|---|
| App Name | Carphacom |
| App Slug / Short Name | carphacom |
| Repo URL | https://github.com/qubitpage/carphacom |
| Support Email | msrusu@qubitpage.com |
| Support URL | https://carphacom.com |
| Operating System | Ubuntu 24.04 LTS x64 |
| Edition | Carphacom Standalone â€” Developer Edition |

## Short Description

Carphacom is a self-hosted, robotised e-commerce Developer Edition with Medusa backend, PostgreSQL, Redis, Next.js storefront, admin UI, and warehouse/digital-twin interfaces, prepared for one-click deployment on Vultr.

## Long Description

Carphacom Standalone â€” Developer Edition is an early root-ready, self-hosted commerce platform image for developers, partners, and evaluators. It includes a working Medusa commerce backend, seeded PostgreSQL database, Redis cache, Next.js storefront, Next.js admin UI, warehouse/digital-twin tools, PM2 process management, Nginx routing, first-boot credential generation, domain/SSL helpers, and a verification tool.

This Marketplace image is intended for development and evaluation. A newer production launch version is being prepared. Production deployments require domain/SSL setup, SMTP/payment/provider configuration, backups, monitoring, firewall review, and additional hardening.

## Readme / App Instructions Summary

After deployment, open:

```text
http://{{ip}}/ro
```

Admin login:

```text
http://{{ip}}/app/login
```

First-login credentials are generated on first boot and stored on the instance:

```bash
cat /root/CARPHACOM_FIRST_LOGIN.txt
```

The image supports optional preseed values through startup/user-data before first boot:

```text
CARPHACOM_ADMIN_EMAIL
CARPHACOM_ADMIN_PASSWORD
CARPHACOM_DOMAIN
```

If no preseed values are provided, the image creates a default admin email `admin@carphacom.local` with a unique generated password.

Run health verification:

```bash
carphacom-verify
```

Set up a domain and SSL after pointing a DNS A record to the instance IP:

```bash
carphacom-domain-ssl your-domain.com
```

Useful routes:

```text
/                 storefront redirect
/ro               storefront
/app/login        admin login
/admin/           redirect to /app
/backend/health   backend health
/warehouse/       warehouse/digital twin
/warehouse-lab/   warehouse lab
/healthz          instance health
```

Important: `/ro/app` is not the admin route; admin is `/app/login`.

## Minimum Requirements

Recommended Vultr plan:

```text
4 vCPU / 8 GB RAM / 160 GB disk or better
```

Light evaluation minimum:

```text
2 vCPU / 4 GB RAM / 80 GB disk
```

Tested OS/image base:

```text
Ubuntu 24.04 LTS x64
```

## Support

- Product/support URL: https://carphacom.com
- Support email: msrusu@qubitpage.com
- Source repository: https://github.com/qubitpage/carphacom


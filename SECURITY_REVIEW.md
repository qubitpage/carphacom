# Carphacom Developer Edition Security Review

Last reviewed: 2026-06-07

## Scope

This review covers the sanitized public repository prepared for:

- GitHub: `qubitpage/carphacom`
- Vultr Marketplace: `Carphacom Standalone — Developer Edition`
- Source tree: Medusa backend, Next.js storefront, Next.js admin panel, Marketplace scripts and documentation.

This repository is intentionally a **Developer Edition**, not a turnkey hardened production distribution.

## Secret scanning

A repository scanner was run before publishing to block:

- API key prefixes such as OpenAI/Groq/Vultr/GitHub tokens
- private keys
- literal password/token/secret assignments
- operational IPs used during the build/test process

Result before push:

```text
SECRET_SCAN_OK
```

No live API keys, server passwords, SSH private keys, Vultr tokens, or operational test IPs are intended to be included in the public repository.

## Dependency audit summary

### Admin panel

```text
npm audit --omit=dev: clean
```

### Storefront

```text
npm audit --omit=dev: clean
```

Mitigation applied:

- Upgraded Next.js to a patched line.
- Upgraded/overrode PostCSS to avoid known vulnerable nested versions.

### Medusa backend

Current Medusa package line:

```text
@medusajs/medusa: 2.15.5
@medusajs/framework: 2.15.5
@medusajs/cli: 2.15.5
@medusajs/file: 2.15.5
```

`npm audit --omit=dev` still reports high/moderate transitive advisories under Medusa framework packages. At the time of review, npm reported `fixAvailable=false` for the primary Medusa framework/core dependency chain and the installed packages were already at the latest published Medusa version.

Developer Edition mitigation:

- Do not expose backend admin/debug endpoints publicly except through the intended reverse proxy.
- Run behind HTTPS.
- Rotate generated secrets on first boot.
- Use strong admin credentials.
- Keep the server patched.
- Re-run `npm audit` when Medusa publishes a patched release and upgrade the backend packages.

This is acceptable for a Developer Edition handoff only with the above caveat clearly disclosed. Production deployments must repeat the audit and apply available upstream fixes.

## Route/security smoke probes

The tested Vultr clone verified:

- Storefront route: `/ro`
- Admin route: `/app/login`
- Backend health: `/backend/health`
- Warehouse routes: `/warehouse/`, `/warehouse-lab/`
- Health route: `/healthz`

Important route note:

- `/ro/app` is expected to be a 404 because admin is **not** under the storefront locale namespace.
- `/admin/` redirects to `/app/`.

## Admin login verification

Real admin authentication was verified against the test clone through the admin auth API using first-boot generated credentials without printing the credentials.

Result:

```text
admin_login_api_ok=yes
```

The first-boot script now:

- generates or accepts admin credentials,
- creates/updates the Medusa admin user,
- grants access in the Carphacom admin access table,
- restarts the relevant services.

## First-boot security model

Fresh one-click deployments should generate their own values for:

- admin password,
- database password,
- Redis password,
- JWT secret,
- cookie secret,
- revalidation secret,
- base URL using the instance public IP or supplied domain.

The final snapshot cleanup removes generated files and first-boot markers so every new instance runs first boot again.

## Production hardening checklist

Before production use:

1. Attach a real domain and enable HTTPS.
2. Rotate all generated secrets after first login.
3. Restrict SSH by key and firewall.
4. Add backups for PostgreSQL and uploads.
5. Add monitoring and log retention.
6. Configure real payment, email, and storage providers.
7. Re-run dependency audits and upgrade Medusa when upstream fixes are available.
8. Disable demo content if not needed.
9. Configure WAF/rate-limits for public APIs.
10. Treat this Developer Edition as a foundation for customization, not as a compliance-certified production appliance.

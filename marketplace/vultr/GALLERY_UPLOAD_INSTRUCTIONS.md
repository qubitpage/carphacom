# Carphacom Vultr Marketplace Gallery Upload Instructions

Vultr Marketplace gallery images are managed in the **Marketplace vendor portal** under:

```text
Edit App -> Application Gallery -> Upload Graphic
```

The public Vultr Cloud API does not expose a documented endpoint for Marketplace vendor-gallery image uploads. Upload these files manually in the portal.

## Required image size

Vultr suggests gallery images around:

```text
800 x 500 px
```

All polished images below are exactly `800x500` PNG.

## Upload order

Upload in this order:

1. `01-carphacom-platform-storefront-800x500.png`
2. `02-carphacom-back-office-admin-800x500.png`
3. `03-made-with-carphacom-statiiinfotrafic-800x500.png`
4. `04-made-with-carphacom-banat-tractor-800x500.png`
5. `05-carphacom-platform-routes-800x500.png`

## Gallery image descriptions

### 1. Carphacom Platform Storefront

File:

```text
gallery/01-carphacom-platform-storefront-800x500.png
```

Source:

```text
https://demo.qubitpage.com/ro
```

Caption suggestion:

```text
Main Carphacom demo storefront design with localized commerce experience and seeded catalog.
```

### 2. Carphacom Back Office / Admin Panel

File:

```text
gallery/02-carphacom-back-office-admin-800x500.png
```

Caption suggestion:

```text
Carphacom back office for products, orders, customers, regions, and platform operations.
```

Important: this is **Carphacom's own admin panel**, not Vultr Cockpit and not a Vultr management console.

### 3. Made with Carphacom: Statii Info Trafic

File:

```text
gallery/03-made-with-carphacom-statiiinfotrafic-800x500.png
```

Example site:

```text
https://statiiinfotrafic.ro/ro
```

Caption suggestion:

```text
Example public site using Carphacom storefront and content patterns.
```

### 4. Made with Carphacom: Banat Tractor

File:

```text
gallery/04-made-with-carphacom-banat-tractor-800x500.png
```

Example site:

```text
https://banat-tractor.ro/ro
```

Caption suggestion:

```text
Industrial commerce example built with Carphacom workflows.
```

### 5. Carphacom Developer Routes

File:

```text
gallery/05-carphacom-platform-routes-800x500.png
```

Caption suggestion:

```text
Developer Edition includes storefront, admin, Medusa API, warehouse, and digital-twin entry routes.
```

## Local preview

Open the generated gallery preview page locally:

```text
artifacts/vultr-marketplace-carphacom/gallery/index.html
```

Or use the localhost preview URL provided by Sentinel Coder after serving the file.

## Notes

- Do not upload raw screenshots ending in `-raw.png`; upload only the polished `-800x500.png` images.
- Correct Carphacom routes shown in the gallery:
  - `/ro` for storefront
  - `/app/login` for Carphacom Back Office / Admin Panel
  - `/warehouse/` for warehouse/digital twin routes
- `/ro/app` is intentionally not used. Admin is not inside the storefront locale namespace.
- The example sites are public examples of sites made with or aligned to the Carphacom platform experience.

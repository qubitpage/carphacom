# PNI B2B Integration Module

## Overview

This module integrates the PNI B2B API with the Medusa backend to import and sync products from the PNI catalog.

## Features

- ✅ **Complete Product Import** - All 30+ attributes, not just basic info
- ✅ **Full Descriptions** - Complete HTML descriptions, not fragments
- ✅ **Volume Tiered Pricing** - Quantity-based discounts (1pc, 3+, 10+, 50+)
- ✅ **Automatic Sync** - Scheduled job runs every 6 hours
- ✅ **Rate Limiting** - Respects PNI API limits (120 req/min)
- ✅ **Token Management** - Auto-refresh with 24h caching
- ✅ **Error Handling** - Comprehensive logging and error tracking

## Data Structure

### Product Data Captured

| Category | Fields |
|----------|--------|
| **Basic** | title, subtitle, handle, SKU, barcode |
| **Description** | Full HTML description + specifications table |
| **Attributes** | 30+ technical specs (frecvență, putere, impedanță, etc.) |
| **Pricing** | Cost price (hidden), RRP (visible), tiered prices |
| **Media** | Images, documents (PDF manuals), videos (YouTube) |
| **Logistics** | Weight, dimensions, package dimensions, HS code |
| **SEO** | Meta title, description, keywords |
| **Status** | is_new, is_featured, availability_date |

### Price Tier Calculation

Formula: `RRP_tier = Cost_tier × (RRP_base / Cost_base)`

Example:
- Base: Cost 100 RON, RRP 150 RON (markup 1.5x)
- Tier 10+: Cost 90 RON → RRP 135 RON (same 1.5x markup)
- Tier 50+: Cost 80 RON → RRP 120 RON (same 1.5x markup)

## File Structure

```
src/
├── modules/pni/
│   ├── types.ts      # TypeScript interfaces for PNI API
│   ├── service.ts    # API client with token & rate limiting
│   ├── importer.ts   # Database import logic
│   └── index.ts      # Module exports
├── jobs/
│   └── sync-pni-products.ts    # Scheduled sync job (every 6h)
├── scripts/
│   └── import-pni-products.ts  # Manual import script
└── api/admin/pni/
    └── route.ts      # Admin API endpoints
```

## Usage

### Manual Import (CLI)

```bash
# Full import with all details
npx ts-node src/scripts/import-pni-products.ts --full

# Quick stock/price update only
npx ts-node src/scripts/import-pni-products.ts --quick

# Test mode (5 products)
npx ts-node src/scripts/import-pni-products.ts --test
```

### Admin API Endpoints

```bash
# Get sync status
GET /admin/pni?action=status

# Test PNI API connection
GET /admin/pni?action=test

# List imported products
GET /admin/pni?action=products&page=1&limit=50

# Trigger manual sync
POST /admin/pni
Body: { "mode": "full" | "quick" }
```

### Curl Examples

```bash
# Get sync status
curl -X GET "https://statiiinfotrafic.ro/admin/pni" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger full sync
curl -X POST "https://statiiinfotrafic.ro/admin/pni" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'
```

## Environment Variables

Add to `.env`:

```env
# PNI B2B API Configuration
PNI_API_URL=https://b2b.mypni.com/api/v1
PNI_USERNAME=statiiinfo
PNI_PASSWORD=
```

## Scheduled Sync

The sync job runs automatically via Medusa's job scheduler:

- **Schedule**: Every 6 hours (`0 */6 * * *`)
- **Full sync**: Once per day (if 24h+ since last full sync)
- **Quick sync**: Stock and price updates only

## Data Flow

```
┌─────────────────┐
│   PNI B2B API   │
│  ~6,000 produse │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PNI Service    │
│  - Token mgmt   │
│  - Rate limit   │
│  - Transform    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Importer      │
│  - Create/Update│
│  - Tier prices  │
│  - Link channel │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Medusa DB      │
│  - Products     │
│  - Variants     │
│  - Prices       │
└─────────────────┘
```

## Storefront Display

### Price Tiers on Product Page

The storefront should display tiered pricing like:

| Quantity | Price/Unit |
|----------|------------|
| 1 pc     | 150 RON    |
| 3+ pcs   | 142 RON    |
| 10+ pcs  | 135 RON    |
| 50+ pcs  | 120 RON    |

**Note**: Cost prices are stored in `metadata.cost_price` and should NOT be displayed on the storefront.

## Troubleshooting

### Token Issues
- Check PNI_USERNAME and PNI_PASSWORD in .env
- Token is valid for 24h, auto-refreshes 5 min before expiry

### Rate Limiting
- Built-in rate limiter at 120 req/min
- If hitting limits, increase delay between requests

### Missing Products
- Check sync status via API
- Look for errors in console logs
- Products with errors are skipped but logged

## Support

For issues with this integration, check:
1. Console logs for error details
2. `/admin/pni?action=status` for sync status
3. Database `system_config` table for sync history

/**
 * Dashboard API - Aggregates real data from all system sources
 * Returns comprehensive stats for the enterprise dashboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Run all queries in parallel for speed
    const [
      productStats,
      orderStats,
      recentOrders,
      customerStats,
      categoryStats,
      blogStats,
      imageStats,
      topProducts,
      recentProducts,
      systemHealth,
      brandData,
      invoiceData,
      stockAlerts,
      revenueTotals,
    ] = await Promise.allSettled([
      // 1. Product statistics
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE metadata->>'import_source' = 'b2b_api') as from_b2b,
          COUNT(*) FILTER (WHERE metadata->>'import_source' = 'csv_upload') as from_csv,
          COUNT(*) FILTER (WHERE metadata->>'import_source' IS NULL OR metadata->>'import_source' = 'manual') as from_manual,
          COUNT(*) FILTER (WHERE thumbnail IS NULL) as no_thumbnail,
          COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as trashed,
          COALESCE(AVG((metadata->>'rrp_price')::numeric) FILTER (WHERE metadata->>'rrp_price' IS NOT NULL AND (metadata->>'rrp_price')::numeric > 0), 0) as avg_price,
          COALESCE(SUM((metadata->>'stock_total')::numeric) FILTER (WHERE metadata->>'stock_total' IS NOT NULL), 0) as total_stock,
          COUNT(*) FILTER (WHERE metadata->>'stock_total' IS NOT NULL AND (metadata->>'stock_total')::int <= 0) as out_of_stock,
          COUNT(*) FILTER (WHERE metadata->>'stock_total' IS NOT NULL AND (metadata->>'stock_total')::int > 0 AND (metadata->>'stock_total')::int <= 5) as low_stock,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
        FROM product WHERE deleted_at IS NULL
      `),

      // 2. Order statistics  
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'canceled') as canceled,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as this_month
        FROM "order" WHERE deleted_at IS NULL
      `),

      // 3. Recent orders with details
      pool.query(`
        SELECT 
          o.id, o.display_id, o.status, o.email, o.currency_code,
          o.created_at, o.metadata,
          os.totals,
          oa.first_name, oa.last_name, oa.city, oa.phone,
          (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id) as item_count
        FROM "order" o
        LEFT JOIN order_summary os ON o.id = os.order_id
        LEFT JOIN order_address oa ON o.shipping_address_id = oa.id
        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at DESC
        LIMIT 10
      `),

      // 4. Customer stats
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
        FROM customer WHERE deleted_at IS NULL
      `),

      // 5. Category stats
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE parent_category_id IS NULL) as top_level,
          COUNT(*) FILTER (WHERE parent_category_id IS NOT NULL) as subcategories
        FROM product_category WHERE deleted_at IS NULL
      `),

      // 6. Blog stats
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM blog_posts) as posts,
          (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as published_posts,
          (SELECT COUNT(*) FROM blog_posts WHERE is_auto_generated = true) as auto_generated,
          (SELECT COUNT(*) FROM blog_categories) as categories
      `),

      // 7. Image stats
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT product_id) as products_with_images,
          ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT product_id), 0), 1) as avg_per_product
        FROM image WHERE deleted_at IS NULL
      `),

      // 8. Top products by stock value
      pool.query(`
        SELECT p.id, p.title, p.handle, p.thumbnail,
          (p.metadata->>'rrp_price')::numeric / 100 as price,
          (p.metadata->>'stock_total')::int as stock,
          p.metadata->>'brand' as brand,
          p.metadata->>'import_source' as source
        FROM product p
        WHERE p.deleted_at IS NULL 
          AND p.metadata->>'stock_total' IS NOT NULL 
          AND (p.metadata->>'stock_total')::int > 0
          AND p.metadata->>'rrp_price' IS NOT NULL
        ORDER BY ((p.metadata->>'rrp_price')::numeric / 100) * (p.metadata->>'stock_total')::int DESC
        LIMIT 5
      `),

      // 9. Recently added products
      pool.query(`
        SELECT p.id, p.title, p.handle, p.thumbnail, p.created_at,
          p.metadata->>'brand' as brand,
          (p.metadata->>'rrp_price')::numeric / 100 as price,
          p.metadata->>'import_source' as source
        FROM product p
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 5
      `),

      // 10. System health - PM2 + disk + memory
      (async () => {
        const results: any = {};
        
        try {
          const { stdout: pm2 } = await execAsync('pm2 jlist 2>/dev/null || echo "[]"');
          const processes = JSON.parse(pm2);
          results.pm2 = processes.map((p: any) => ({
            name: p.name,
            status: p.pm2_env?.status,
            memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
            cpu: p.monit?.cpu || 0,
            restarts: p.pm2_env?.restart_time || 0,
            uptime: p.pm2_env?.pm_uptime || 0,
          }));
        } catch { results.pm2 = []; }

        try {
          const { stdout: disk } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
          const [total, used, avail, usePct] = disk.trim().split(/\s+/);
          results.disk = { total, used, available: avail, usagePercent: parseInt(usePct) };
        } catch { results.disk = null; }

        try {
          const { stdout: mem } = await execAsync("free -m | grep Mem | awk '{print $2,$3,$4,$7}'");
          const [total, used, free, available] = mem.trim().split(/\s+/).map(Number);
          results.memory = { totalMB: total, usedMB: used, freeMB: free, availableMB: available, usagePercent: Math.round((used / total) * 100) };
        } catch { results.memory = null; }

        try {
          const { stdout: uptime } = await execAsync("uptime -p");
          results.uptime = uptime.trim();
        } catch { results.uptime = 'unknown'; }

        // Quick service checks
        const checks = await Promise.allSettled([
          fetch('http://localhost:9000/health', { signal: AbortSignal.timeout(3000) }).then(r => ({ name: 'Medusa Backend', ok: r.ok })),
          fetch('http://localhost:8000', { signal: AbortSignal.timeout(3000) }).then(r => ({ name: 'Storefront', ok: r.ok || r.status === 308 })),
          fetch('http://localhost:3000/app/api/products?limit=1', { signal: AbortSignal.timeout(3000) }).then(r => ({ name: 'Admin Panel', ok: r.ok })),
        ]);
        
        results.services = checks.map((c, i) => {
          const names = ['Medusa Backend', 'Storefront (Next.js)', 'Admin Panel'];
          if (c.status === 'fulfilled') return { name: names[i], status: 'online' };
          return { name: names[i], status: 'offline' };
        });

        return results;
      })(),

      // 11. Brand data from JSON
      (async () => {
        try {
          const brandsPath = path.join(process.cwd(), 'data', 'brands.json');
          const data = JSON.parse(fs.readFileSync(brandsPath, 'utf8'));
          const brandList = Array.isArray(data) ? data : (data.brands || []);
          return { count: brandList.length, brands: brandList };
        } catch { return { count: 0, brands: [] }; }
      })(),

      // 12. Invoice data
      (async () => {
        try {
          const res = await fetch('http://127.0.0.1:3000/app/api/invoices?action=list', { signal: AbortSignal.timeout(3000) });
          const data = await res.json();
          const invoices = data.data || [];
          return {
            count: invoices.length,
            recent: invoices.slice(0, 5),
            totalValue: invoices.reduce((sum: number, inv: any) => sum + (inv.totalCuTVA || 0), 0),
          };
        } catch { return { count: 0, recent: [], totalValue: 0 }; }
      })(),

      // 13. Stock alerts (low / out of stock)
      pool.query(`
        SELECT p.id, p.title, p.handle, p.thumbnail,
          (p.metadata->>'stock_total')::int as stock,
          p.metadata->>'brand' as brand,
          (p.metadata->>'rrp_price')::numeric / 100 as price
        FROM product p
        WHERE p.deleted_at IS NULL 
          AND p.metadata->>'stock_total' IS NOT NULL 
          AND (p.metadata->>'stock_total')::int <= 5
        ORDER BY (p.metadata->>'stock_total')::int ASC
        LIMIT 10
      `),

      // 14. Revenue totals from ALL orders
      pool.query(`
        SELECT 
          COALESCE(SUM((os.totals->>'current_order_total')::numeric), 0) as total_revenue,
          COALESCE(SUM((os.totals->>'current_order_total')::numeric) FILTER (WHERE o.status = 'pending'), 0) as pending_revenue
        FROM "order" o
        LEFT JOIN order_summary os ON o.id = os.order_id
        WHERE o.deleted_at IS NULL
      `),
    ]);

    // Calculate revenue from dedicated query
    const orders = recentOrders.status === 'fulfilled' ? recentOrders.value.rows : [];
    const revData = revenueTotals.status === 'fulfilled' ? revenueTotals.value.rows[0] : {};
    const totalRevenue = parseFloat(revData.total_revenue || '0');
    const pendingRevenue = parseFloat(revData.pending_revenue || '0');

    const response = {
      timestamp: new Date().toISOString(),
      loadTimeMs: Date.now() - startTime,
      
      products: productStats.status === 'fulfilled' ? productStats.value.rows[0] : {},
      orders: orderStats.status === 'fulfilled' ? orderStats.value.rows[0] : {},
      recentOrders: orders.map((o: any) => ({
        id: o.id,
        displayId: o.display_id,
        status: o.status,
        email: o.email,
        currency: o.currency_code,
        createdAt: o.created_at,
        metadata: o.metadata,
        total: (o.totals?.current_order_total || o.totals?.original_order_total || 0) / 100,
        customer: {
          firstName: o.first_name,
          lastName: o.last_name,
          city: o.city,
          phone: o.phone,
        },
        itemCount: parseInt(o.item_count) || 0,
      })),
      revenue: {
        total: totalRevenue / 100,
        pending: pendingRevenue / 100,
        currency: 'RON',
      },
      customers: customerStats.status === 'fulfilled' ? customerStats.value.rows[0] : {},
      categories: categoryStats.status === 'fulfilled' ? categoryStats.value.rows[0] : {},
      blog: blogStats.status === 'fulfilled' ? blogStats.value.rows[0] : {},
      images: imageStats.status === 'fulfilled' ? imageStats.value.rows[0] : {},
      topProducts: topProducts.status === 'fulfilled' ? topProducts.value.rows : [],
      recentProducts: recentProducts.status === 'fulfilled' ? recentProducts.value.rows : [],
      system: systemHealth.status === 'fulfilled' ? systemHealth.value : {},
      brands: brandData.status === 'fulfilled' ? brandData.value : { count: 0 },
      invoices: invoiceData.status === 'fulfilled' ? invoiceData.value : { count: 0 },
      stockAlerts: stockAlerts.status === 'fulfilled' ? stockAlerts.value.rows : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}

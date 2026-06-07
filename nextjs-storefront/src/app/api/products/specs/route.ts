import { NextResponse, NextRequest } from "next/server"
import { Pool } from "pg"

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || "5432"),
  database: process.env.DB_NAME || process.env.DATABASE_NAME || "medusa_store",
  user: process.env.DB_USER || process.env.DATABASE_USER || "medusa",
  password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || "",
})

type SpecItem = {
  label: string
  value: string
  section?: string
}

const sectionHeadings = new Set([
  'motor', 'motor & baterie', 'transmisie', 'priza de putere (pto)', 'pto și hidraulică',
  'sistem hidraulic', 'sistem de direcție', 'sistem de frânare', 'punte față', 'cauciucuri',
  'cuplaj de remorcare', 'cabină', 'cadru de protecție', 'dimensiuni', 'greutate',
  'capacități', 'alte caracteristici', 'ridicare hidraulică', 'direcție', 'frâne',
  'anvelope', 'punte, direcție, frâne', 'încărcare & autonomie', 'dotări standard'
])

function normalizeSpecRows(rows: any[], fallbackSection: string): SpecItem[] {
  const specifications: SpecItem[] = []
  let currentSection = fallbackSection === 'Specificații catalog' ? 'Caracteristici principale' : fallbackSection

  rows.forEach((raw) => {
    const text = String(raw || '').replace(/\s+/g, ' ').trim()
    if (!text) return
    if (sectionHeadings.has(text.toLowerCase())) {
      currentSection = text
      return
    }
    const parts = text.split(':')
    if (parts.length > 1) {
      const label = parts.shift()!.trim()
      const value = parts.join(':').trim()
      if (label && value) specifications.push({ label, value, section: currentSection })
      return
    }
    specifications.push({ label: text, value: 'Inclus', section: currentSection })
  })

  return specifications
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const productId = searchParams.get("id")
  const handle = searchParams.get("handle")
  
  if (!productId && !handle) {
    return NextResponse.json({ error: "Product ID or handle required" }, { status: 400 })
  }
  
  try {
    const client = await pool.connect()
    
    const query = productId 
      ? `SELECT id, title, handle, description, metadata FROM product WHERE id = $1`
      : `SELECT id, title, handle, description, metadata FROM product WHERE handle = $1`
    
    const result = await client.query(query, [productId || handle])
    client.release()
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    
    const product = result.rows[0]
    const metadata = product.metadata || {}
    
    // Handle specifications - can be array of {label, value, section} or object
    let specifications: SpecItem[] = []
    if (metadata.specifications) {
      if (Array.isArray(metadata.specifications)) {
        // New format: array of {label, value, section}
        specifications = metadata.specifications
      } else if (typeof metadata.specifications === 'object') {
        Object.entries(metadata.specifications).forEach(([section, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            specifications.push(...normalizeSpecRows(Object.values(value), section))
          } else {
            const text = String(value || '').trim()
            if (!text) return
            const parts = text.split(':')
            specifications.push(parts.length > 1
              ? { label: parts.shift()!.trim(), value: parts.join(':').trim(), section }
              : { label: section, value: text, section: 'General' })
          }
        })
      }
    }
    
    return NextResponse.json({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      metadata: metadata,
      specifications: specifications,
      pricing: {
        distribution_price: metadata.distribution_price_ron,
        rrp_price: metadata.rrp_price,
        retail_price: metadata.retail_price_ron,
        cost_price: metadata.cost_price,
      }
    })
  } catch (error) {
    console.error("Error fetching product specs:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}

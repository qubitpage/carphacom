import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const BRANDS_FILE = path.join(process.cwd(), 'data', 'brands.json')

interface Brand {
  id: string
  name: string
  slug: string
  description: string
  logo: string
  country: string
  website: string
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

interface BrandsData {
  brands: Brand[]
  updated_at: string
}

async function readBrands(): Promise<BrandsData> {
  try {
    const data = await fs.readFile(BRANDS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Return empty if file doesn't exist
    return { brands: [], updated_at: new Date().toISOString() }
  }
}

async function writeBrands(data: BrandsData): Promise<void> {
  data.updated_at = new Date().toISOString()
  await fs.writeFile(BRANDS_FILE, JSON.stringify(data, null, 2))
}

// GET /api/brands - List all brands
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const featuredOnly = searchParams.get('featured') === 'true'
    
    const data = await readBrands()
    let brands = data.brands
    
    if (activeOnly) {
      brands = brands.filter(b => b.is_active)
    }
    if (featuredOnly) {
      brands = brands.filter(b => b.is_featured)
    }
    
    // Sort by sort_order
    brands.sort((a, b) => a.sort_order - b.sort_order)
    
    return NextResponse.json({
      brands,
      count: brands.length,
      updated_at: data.updated_at
    })
  } catch (error) {
    console.error('Error reading brands:', error)
    return NextResponse.json(
      { error: 'Failed to read brands' },
      { status: 500 }
    )
  }
}

// POST /api/brands - Create new brand
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await readBrands()
    
    // Generate ID from name if not provided
    const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    
    // Check for duplicate
    if (data.brands.some(b => b.id === id)) {
      return NextResponse.json(
        { error: 'Brand with this ID already exists' },
        { status: 400 }
      )
    }
    
    const newBrand: Brand = {
      id,
      name: body.name,
      slug: body.slug || id,
      description: body.description || '',
      logo: body.logo || `/brands/${id}.png`,
      country: body.country || '',
      website: body.website || '',
      is_active: body.is_active ?? true,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? data.brands.length + 1
    }
    
    data.brands.push(newBrand)
    await writeBrands(data)
    
    return NextResponse.json({ brand: newBrand, success: true })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}

// PUT /api/brands - Update brand
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }
    
    const data = await readBrands()
    const index = data.brands.findIndex(b => b.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    // Update brand
    data.brands[index] = { ...data.brands[index], ...updates }
    await writeBrands(data)
    
    return NextResponse.json({ brand: data.brands[index], success: true })
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

// DELETE /api/brands - Delete brand
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }
    
    const data = await readBrands()
    const index = data.brands.findIndex(b => b.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    data.brands.splice(index, 1)
    await writeBrands(data)
    
    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}

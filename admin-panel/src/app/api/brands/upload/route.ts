import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const BRANDS_DIR = path.join(process.cwd(), 'public', 'brands')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const brandSlug = (formData.get('brandSlug') as string) || 'brand'

    if (!file) {
      return NextResponse.json({ error: 'Nu a fost selectat niciun fișier' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format invalid. Sunt acceptate: PNG, JPEG, WebP, SVG, GIF' }, { status: 400 })
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fișierul este prea mare (max 2MB)' }, { status: 400 })
    }

    await mkdir(BRANDS_DIR, { recursive: true })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeSlug = brandSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const filename = `${safeSlug}.${ext}`
    const filepath = path.join(BRANDS_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const url = `/brands/${filename}`

    return NextResponse.json({ 
      success: true, 
      url,
      filename,
      size: file.size 
    })
  } catch (error) {
    console.error('Brand logo upload error:', error)
    return NextResponse.json({ error: 'Eroare la upload' }, { status: 500 })
  }
}

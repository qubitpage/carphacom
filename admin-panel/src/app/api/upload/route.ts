import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Folder for uploads - shared across deploys
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/opt/qubitpage/shared/uploads'
const PUBLIC_URL = process.env.PUBLIC_UPLOAD_URL || '/app/api/uploads'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Accept both 'file' (single) and 'files' (multiple)
    let files: File[] = []
    const singleFile = formData.get('file') as File | null
    const multipleFiles = formData.getAll('files') as File[]
    
    if (singleFile instanceof File) {
      files = [singleFile]
    } else if (multipleFiles.length > 0) {
      files = multipleFiles.filter(f => f instanceof File)
    }
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const uploadedFiles: { url: string; name: string }[] = []

    for (const file of files) {
      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      if (!cleanName || cleanName === '.' || cleanName === '..') {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
      }
      const filename = `${timestamp}-${cleanName}`
      const filepath = path.join(UPLOAD_DIR, filename)
      
      // Read file buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)
      
      // Return public URL
      uploadedFiles.push({
        url: `${PUBLIC_URL}/${filename}`,
        name: file.name
      })
    }

    // Return format compatible with both single and multiple file requests
    return NextResponse.json({ 
      url: uploadedFiles[0]?.url, // For single file requests
      files: uploadedFiles,       // For multiple file requests
      success: true 
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Upload endpoint ready',
    uploadDir: UPLOAD_DIR,
    publicUrl: PUBLIC_URL
  })
}

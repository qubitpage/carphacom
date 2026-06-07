import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const BACKUP_DIR = "/var/backups/carphacom"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get("file")

    if (!filename) {
      return NextResponse.json({ error: "File parameter required" }, { status: 400 })
    }

    // Security: prevent path traversal
    const safeName = path.basename(filename)
    const filepath = path.join(BACKUP_DIR, safeName)

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const stat = fs.statSync(filepath)
    const fileBuffer = fs.readFileSync(filepath)

    // Determine content type
    let contentType = "application/octet-stream"
    if (safeName.endsWith(".tar.gz")) contentType = "application/gzip"
    else if (safeName.endsWith(".sql.gz")) contentType = "application/gzip"
    else if (safeName.endsWith(".sql")) contentType = "application/sql"
    else if (safeName.endsWith(".zip")) contentType = "application/zip"

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": stat.size.toString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

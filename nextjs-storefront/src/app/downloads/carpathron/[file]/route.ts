// Update feed for the Carpathron Windows apps (Muse Carpathron and Carpathron Robotics & Coding).
// The apps' auto-updater (electron-updater, "generic" provider) reads
//   https://qubitpage.com/downloads/carpathron/<channel>.yml   (muse.yml, store.yml)
// and then downloads the installer named inside it from the same address.
// The files are assets of the latest GitHub release of qubitpage/carpathron-muse. This address never changes, so
// installed apps keep updating even if the files move somewhere else later (change only this file).
import { NextResponse } from "next/server"

const REPO = process.env.CARPATHRON_RELEASES_REPO || "qubitpage/carpathron-muse"
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/

export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params
  if (!SAFE.test(file) || !/\.(yml|exe|blockmap)$/.test(file)) {
    return new NextResponse("Not found", { status: 404 })
  }
  const url = `https://github.com/${REPO}/releases/latest/download/${file}`
  if (file.endsWith(".yml")) {
    try {
      const r = await fetch(url, { redirect: "follow", next: { revalidate: 300 } })
      if (!r.ok) return new NextResponse("No update information", { status: 404 })
      return new NextResponse(await r.text(), {
        headers: { "content-type": "text/yaml; charset=utf-8", "cache-control": "public, max-age=300" },
      })
    } catch {
      return new NextResponse("Update server unavailable", { status: 502 })
    }
  }
  return NextResponse.redirect(url, 302)
}

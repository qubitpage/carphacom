import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'
import { startScrapeJob, cancelJob, isJobRunning, BUSINESS_CATEGORIES_FULL } from '@/lib/marketing/scraper-engine'

export const dynamic = 'force-dynamic'

// GET /api/marketing/scrape — list scrape jobs + categories (full with subcategories)
export async function GET(req: NextRequest) {
  try {
    const pool = getPool()
    const { rows: jobs } = await pool.query(
      `SELECT j.*, l.name as list_name 
       FROM mkt_scrape_jobs j 
       LEFT JOIN mkt_contact_lists l ON j.list_id = l.id 
       ORDER BY j.created_at DESC LIMIT 20`
    )

    // Mark running state from memory
    for (const job of jobs) {
      if (job.status === 'running' && !isJobRunning(job.id)) {
        await pool.query(`UPDATE mkt_scrape_jobs SET status = 'completed' WHERE id = $1 AND status = 'running'`, [job.id])
        job.status = 'completed'
      }
    }

    return NextResponse.json({ jobs, categories: BUSINESS_CATEGORIES_FULL })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/scrape — start new scrape job
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { list_id, sources, categories, subcategories, target_count, city, use_proxy } = body

    if (!list_id) return NextResponse.json({ error: 'list_id obligatoriu' }, { status: 400 })
    if (!sources || sources.length === 0) return NextResponse.json({ error: 'Selectează cel puțin o sursă' }, { status: 400 })
    if (!categories || categories.length === 0) return NextResponse.json({ error: 'Selectează cel puțin o categorie' }, { status: 400 })

    const pool = getPool()
    const { rows } = await pool.query(
      `INSERT INTO mkt_scrape_jobs (list_id, status, sources, categories, target_count) 
       VALUES ($1, 'pending', $2, $3, $4) RETURNING *`,
      [list_id, sources, categories, target_count || 300]
    )
    const job = rows[0]

    // Start in background with new params
    startScrapeJob(
      job.id, list_id, sources, categories,
      target_count || 300, city || '', '',
      subcategories || {}, use_proxy || false
    )

    return NextResponse.json({ job }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/scrape — cancel running job
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const jobId = searchParams.get('job_id')
    if (!jobId) return NextResponse.json({ error: 'job_id obligatoriu' }, { status: 400 })

    cancelJob(parseInt(jobId))
    const pool = getPool()
    await pool.query(`UPDATE mkt_scrape_jobs SET status = 'cancelled' WHERE id = $1`, [jobId])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

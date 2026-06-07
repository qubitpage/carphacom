/**
 * Scraping Engine v2 — Orchestrates all scrapers
 * Features: proxy rotation, rich categories with subcategories,
 * Google Maps scraping, web search, rate-limited with delays
 */
import { getPool } from './db'
import { scrapeDirectSearch } from './scraper-websearch'
import { scrapeGoogleMaps } from './scraper-googlemaps'
import { BUSINESS_CATEGORIES_FULL, getCategoryKeywords, getFlatCategories } from './business-categories'

// Re-export for backward compat
export { BUSINESS_CATEGORIES_FULL, getFlatCategories }
export const BUSINESS_CATEGORIES = getFlatCategories()

// Track running jobs in memory
const runningJobs = new Map<number, { cancel: boolean }>()

export function cancelJob(jobId: number) {
  const job = runningJobs.get(jobId)
  if (job) job.cancel = true
}

export function isJobRunning(jobId: number): boolean {
  return runningJobs.has(jobId)
}

/**
 * Start a scraping job (runs in background)
 * @param sources — 'websearch', 'googlemaps'
 * @param categories — category IDs (e.g. 'transport')
 * @param subcategories — optional { categoryId: [subcatId, ...] }
 * @param useProxy — route through proxy pool
 */
export async function startScrapeJob(
  jobId: number,
  listId: number,
  sources: string[],
  categories: string[],
  targetCount: number = 300,
  city: string = '',
  googleApiKey?: string,
  subcategories?: Record<string, string[]>,
  useProxy: boolean = false,
): Promise<void> {
  const pool = getPool()
  const control = { cancel: false }
  runningJobs.set(jobId, control)

  try {
    await pool.query(
      `UPDATE mkt_scrape_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [jobId]
    )

    let totalNew = 0
    let totalDup = 0
    let totalErrors = 0
    const errorMsgs: string[] = []

    for (const catId of categories) {
      if (control.cancel) break

      const cat = BUSINESS_CATEGORIES_FULL.find(c => c.id === catId)
      if (!cat) continue

      const subIds = subcategories?.[catId] || []
      const keywords = getCategoryKeywords(catId, subIds.length > 0 ? subIds : undefined)

      const remaining = targetCount - totalNew
      if (remaining <= 0) break
      const perSource = Math.ceil(remaining / sources.length)

      for (const source of sources) {
        if (control.cancel) break
        const sourceRemaining = Math.min(perSource, targetCount - totalNew)
        if (sourceRemaining <= 0) break

        try {
          const onProgress = async (count: number) => {
            await pool.query(
              `UPDATE mkt_scrape_jobs SET scraped_count = $1, new_count = $2, duplicate_count = $3 WHERE id = $4`,
              [totalNew + totalDup + count, totalNew + count, totalDup, jobId]
            ).catch(() => {})
          }

          switch (source) {
            case 'websearch': {
              for (const kw of keywords.slice(0, 6)) {
                if (control.cancel || totalNew >= targetCount) break
                const kwRemaining = Math.min(
                  Math.ceil(sourceRemaining / Math.min(keywords.length, 6)),
                  targetCount - totalNew
                )
                if (kwRemaining <= 0) break

                const result = await scrapeDirectSearch(
                  kw, catId, city, kwRemaining,
                  listId, jobId, onProgress, () => control.cancel,
                  useProxy
                )
                totalNew += result.inserted
                totalDup += result.duplicates
                totalErrors += result.errors

                await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000))
              }
              break
            }

            case 'googlemaps': {
              const result = await scrapeGoogleMaps(
                keywords.slice(0, 5), catId, city, sourceRemaining,
                listId, jobId, useProxy, onProgress, () => control.cancel
              )
              totalNew += result.inserted
              totalDup += result.duplicates
              totalErrors += result.errors
              break
            }

            default:
              console.log(`[SCRAPER] Unknown source: ${source}`)
          }

          await pool.query(
            `UPDATE mkt_scrape_jobs SET scraped_count = $1, new_count = $2, duplicate_count = $3, error_count = $4 WHERE id = $5`,
            [totalNew + totalDup, totalNew, totalDup, totalErrors, jobId]
          ).catch(() => {})

        } catch (err: any) {
          totalErrors++
          errorMsgs.push(`${source}/${catId}: ${err.message}`)
        }
      }
    }

    await pool.query(
      `UPDATE mkt_scrape_jobs SET status = $1, completed_at = NOW(), scraped_count = $2, new_count = $3, duplicate_count = $4, error_count = $5, errors = $6 WHERE id = $7`,
      [control.cancel ? 'cancelled' : 'completed', totalNew + totalDup, totalNew, totalDup, totalErrors, JSON.stringify(errorMsgs), jobId]
    )
  } catch (err: any) {
    await pool.query(
      `UPDATE mkt_scrape_jobs SET status = 'failed', completed_at = NOW(), errors = $1 WHERE id = $2`,
      [JSON.stringify([err.message]), jobId]
    ).catch(() => {})
  } finally {
    runningJobs.delete(jobId)
  }
}

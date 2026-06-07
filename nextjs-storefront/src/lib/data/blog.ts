"use server"

import { Pool } from "pg"

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "medusa_store",
  user: "medusa",
  password: process.env.DATABASE_PASSWORD || "",
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

export type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  featured_image: string | null
  author: string
  status: string
  category: string | null
  tags: string[]
  related_product_ids: string[]
  seo_title: string | null
  seo_description: string | null
  view_count: number
  is_auto_generated: boolean
  created_at: Date
  updated_at: Date
  published_at: Date | null
}

export type BlogCategory = {
  id: string
  name: string
  slug: string
  description: string | null
}

// Get all published blog posts
export async function getBlogPosts(options?: {
  limit?: number
  offset?: number
  category?: string
}): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const limit = options?.limit || 10
    const offset = options?.offset || 0
    const category = options?.category
    
    let baseWhere = `WHERE bp.status = 'published'`
    let fromClause = `FROM blog_posts bp`
    const params: any[] = []
    
    if (category) {
      // Join with blog_categories to match by slug
      fromClause = `FROM blog_posts bp
        INNER JOIN blog_categories bc ON LOWER(bp.category) = LOWER(bc.name)`
      baseWhere += ` AND bc.slug = $1`
      params.push(category)
    }
    
    // Count query (no ORDER BY)
    const countQuery = `SELECT COUNT(*) ${fromClause} ${baseWhere}`
    const countResult = await pool.query(countQuery, params)
    
    // Select query with pagination
    const selectQuery = `
      SELECT bp.* ${fromClause} ${baseWhere}
      ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    const selectParams = [...params, limit, offset]
    const result = await pool.query(selectQuery, selectParams)
    
    return {
      posts: result.rows,
      total: parseInt(countResult.rows[0].count)
    }
  } catch (error) {
    console.error("getBlogPosts error:", error)
    return { posts: [], total: 0 }
  }
}

// Get single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [slug]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    // Increment view count
    await pool.query(
      `UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = $1`,
      [slug]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error("getBlogPostBySlug error:", error)
    return null
  }
}

// Get blog categories
export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_categories ORDER BY name`
    )
    return result.rows
  } catch (error) {
    console.error("getBlogCategories error:", error)
    return []
  }
}

// Get recent posts (for sidebar/footer)
export async function getRecentBlogPosts(limit: number = 5): Promise<BlogPost[]> {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, excerpt, featured_image, published_at, category 
       FROM blog_posts 
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, created_at DESC 
       LIMIT $1`,
      [limit]
    )
    return result.rows
  } catch (error) {
    console.error("getRecentBlogPosts error:", error)
    return []
  }
}

// Get related posts
export async function getRelatedBlogPosts(postId: string, category: string | null, limit: number = 3): Promise<BlogPost[]> {
  const result = await pool.query(
    `SELECT id, title, slug, excerpt, featured_image, published_at 
     FROM blog_posts 
     WHERE status = 'published' 
       AND id != $1 
       ${category ? "AND category = $3" : ""}
     ORDER BY published_at DESC NULLS LAST
     LIMIT $2`,
    category ? [postId, limit, category] : [postId, limit]
  )
  return result.rows
}

// Search blog posts
export async function searchBlogPosts(query: string, limit: number = 10): Promise<BlogPost[]> {
  const searchTerms = `%${query.toLowerCase()}%`
  const result = await pool.query(
    `SELECT * FROM blog_posts 
     WHERE status = 'published' 
       AND (LOWER(title) LIKE $1 OR LOWER(excerpt) LIKE $1 OR LOWER(content) LIKE $1)
     ORDER BY published_at DESC NULLS LAST
     LIMIT $2`,
    [searchTerms, limit]
  )
  return result.rows
}

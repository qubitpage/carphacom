"use server"

import { Pool } from "pg"

// Database connection
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "medusa_store",
  user: "medusa",
  password: process.env.DATABASE_PASSWORD || "",
  ssl: false,
  max: 5,
  idleTimeoutMillis: 30000,
})

// AI API Keys: configure through environment variables. Never hardcode provider keys.
const GROQ_API_KEY = process.env.GROQ_API_KEY || ""
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

// ===== Types =====

export type BlogGenerationRequest = {
  topic: string
  category: string
  keywords?: string[]
  tone?: "informativ" | "prietenos" | "tehnic" | "promotional"
  length?: "scurt" | "mediu" | "lung"
}

export type GeneratedBlogPost = {
  title: string
  slug: string
  excerpt: string
  content: string
  seo_title: string
  seo_description: string
  tags: string[]
}

type ProductForBlog = {
  id: string
  title: string
  brand: string
  description: string
  handle: string
  image_url: string | null
  price: number | null
  currency: string
  category_name: string | null
  product_url: string
}

// ===== Helpers =====

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îí]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100)
}

// Strip HTML tags from product description to get clean text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500)
}

// Format price from minor units (e.g. 37815 → "378,15 lei")
function formatPrice(amount: number | null): string {
  if (!amount) return ""
  const major = Math.floor(amount / 100)
  const minor = amount % 100
  return `${major},${minor.toString().padStart(2, '0')} lei`
}

// ===== Product Picker =====

// Pick a random published product with its image, price, and category
async function pickRandomProduct(): Promise<ProductForBlog> {
  // Get a random product that hasn't been blogged about recently
  const result = await pool.query(`
    SELECT 
      p.id, p.title, p.subtitle as brand, p.description, p.handle,
      (SELECT i.url FROM image i WHERE i.product_id = p.id AND i.rank = 0 LIMIT 1) as image_url,
      (SELECT pr.amount FROM price pr 
       JOIN product_variant_price_set pvps ON pr.price_set_id = pvps.price_set_id
       JOIN product_variant pv ON pvps.variant_id = pv.id
       WHERE pv.product_id = p.id AND pr.currency_code = 'ron'
       LIMIT 1) as price,
      (SELECT pc.name FROM product_category pc
       JOIN product_category_product pcp ON pc.id = pcp.product_category_id
       WHERE pcp.product_id = p.id
       LIMIT 1) as category_name
    FROM product p
    WHERE p.status = 'published'
      AND p.id NOT IN (
        SELECT UNNEST(related_product_ids) FROM blog_posts 
        WHERE is_auto_generated = true 
          AND created_at > NOW() - INTERVAL '7 days'
          AND related_product_ids IS NOT NULL
      )
    ORDER BY RANDOM()
    LIMIT 1
  `)

  if (result.rows.length === 0) {
    // Fallback: any random published product
    const fallback = await pool.query(`
      SELECT 
        p.id, p.title, p.subtitle as brand, p.description, p.handle,
        (SELECT i.url FROM image i WHERE i.product_id = p.id AND i.rank = 0 LIMIT 1) as image_url,
        (SELECT pr.amount FROM price pr 
         JOIN product_variant_price_set pvps ON pr.price_set_id = pvps.price_set_id
         JOIN product_variant pv ON pvps.variant_id = pv.id
         WHERE pv.product_id = p.id AND pr.currency_code = 'ron'
         LIMIT 1) as price,
        (SELECT pc.name FROM product_category pc
         JOIN product_category_product pcp ON pc.id = pcp.product_category_id
         WHERE pcp.product_id = p.id
         LIMIT 1) as category_name
      FROM product p
      WHERE p.status = 'published'
      ORDER BY RANDOM()
      LIMIT 1
    `)
    if (fallback.rows.length === 0) {
      throw new Error("No published products found in store")
    }
    const row = fallback.rows[0]
    return { ...row, currency: "RON", product_url: `/ro/products/${row.handle}` }
  }

  const row = result.rows[0]
  return { ...row, currency: "RON", product_url: `/ro/products/${row.handle}` }
}

// ===== AI Calls =====

// Call Groq API with model fallback for rate limits
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string | null> {
  // Try models in order: best quality first, fallback to smaller with higher rate limits
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ]
  
  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Groq API error (${model}):`, errorText)
        // If rate limited, try next model
        if (response.status === 429) {
          console.log(`Rate limited on ${model}, trying next model...`)
          continue
        }
        return null
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || null
      if (content) {
        console.log(`[AutoBlog] Generated with model: ${model}`)
        return content
      }
    } catch (error) {
      console.error(`Groq API call failed (${model}):`, error)
      continue
    }
  }
  
  return null
}

// Call OpenAI API (fallback)
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text())
      return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    console.error("OpenAI API call failed:", error)
    return null
  }
}

// Call AI with fallback
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  let result = await callGroq(systemPrompt, userPrompt)
  
  if (!result) {
    console.log("Groq failed, falling back to OpenAI...")
    result = await callOpenAI(systemPrompt, userPrompt)
  }
  
  if (!result) {
    throw new Error("Both AI providers failed")
  }
  
  return result
}

// ===== JSON Parser =====

function parseAIJson(aiResponse: string): any {
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in response")
  }

  let jsonStr = jsonMatch[0]

  // Fix newlines inside string values
  const lines = jsonStr.split('\n')
  let inString = false
  let fixedJson = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const quotes = (line.match(/(?<!\\)"/g) || []).length

    if (inString) {
      fixedJson += '\\n' + line.replace(/\n/g, '\\n')
      if (quotes % 2 === 1) inString = false
    } else {
      if (i > 0) fixedJson += '\n'
      fixedJson += line
      if (quotes % 2 === 1) inString = true
    }
  }

  try {
    return JSON.parse(fixedJson)
  } catch (e) {
    // Fallback cleanup
    let cleanJson = jsonMatch[0]
      .replace(/"\s*:\s*"([^"]*)\n\s*/g, '": "$1 ')
      .replace(/\n\s*</g, ' <')
      .replace(/>\n\s*/g, '> ')
      .replace(/\n\s+/g, ' ')
    return JSON.parse(cleanJson)
  }
}

// ===== Product Blog Generator (main autoblog function) =====

export async function autoGenerateProductBlog(): Promise<{
  success: boolean
  postId?: string
  productTitle?: string
  blogTitle?: string
  error?: string
}> {
  try {
    // 1. Pick a random product from the store
    const product = await pickRandomProduct()
    console.log(`[AutoBlog] Picked product: ${product.title} (${product.brand})`)

    // 2. Clean up product description
    const cleanDescription = product.description ? stripHtml(product.description) : ""
    const priceStr = formatPrice(product.price)

    // 3. Build AI prompt for product-focused blog article
    const systemPrompt = `Ești un copywriter expert pentru un magazin online românesc de echipamente electronice, comunicații radio, supraveghere video și accesorii auto.
Scrii articole de blog promoționale care prezintă produse din magazin.
Scrie DOAR în limba română, cu diacritice corecte (ă, â, î, ș, ț).
Stilul: profesional, prietenos, convingător, optimizat pentru SEO și Google indexare.
Scopul: promovarea produselor din magazin prin articole utile și informative.
Magazinul se numește "StatiiInfoTrafic.ro" - echipamente radio și comunicații.`

    const userPrompt = `Scrie un articol de blog promoțional pentru următorul produs din magazinul nostru:

PRODUS: ${product.title}
BRAND: ${product.brand || "N/A"}
CATEGORIE: ${product.category_name || "Echipamente electronice"}
PREȚ: ${priceStr || "Disponibil pe site"}
DESCRIERE PRODUS: ${cleanDescription || "Produs de calitate din gama " + (product.brand || "noastră")}
LINK PRODUS: https://statiiinfotrafic.ro${product.product_url}

Cerințe pentru articol:
1. TITLU: Trebuie să conțină brandul (${product.brand || ""}) și modelul/numele produsului. Să fie atractiv, Google-friendly, max 70 caractere.
2. CONȚINUT (800-1200 cuvinte): 
   - Introducere care captează atenția și prezintă problema pe care o rezolvă produsul
   - Secțiune "De ce ai nevoie de [produs]" - cazuri de utilizare practice
   - Secțiune cu caracteristici tehnice și avantaje principale
   - Secțiune "Pentru cine este recomandat" - publicul țintă
   - Concluzii cu call-to-action către magazin
   - Include un link HTML către produs: <a href="https://statiiinfotrafic.ro${product.product_url}">Vezi produsul în magazin</a>
   - IMPORTANT: NU include linkuri către alte website-uri externe. Singurele linkuri permise sunt către https://statiiinfotrafic.ro
3. Toate câmpurile din JSON trebuie să fie completate

Returnează EXACT acest format JSON (fără text suplimentar):
{
  "title": "Titlu cu brand și model - max 70 caractere, SEO friendly",
  "excerpt": "Rezumat scurt 150-160 caractere despre produs și beneficii",
  "content": "HTML complet pe o singură linie: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a>. Fără newlines în string.",
  "seo_title": "Titlu SEO max 60 caractere cu brand și model",
  "seo_description": "Meta description max 155 caractere cu cuvinte cheie principale",
  "tags": ["${product.brand || "echipamente"}", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANT: conținutul HTML trebuie pe o SINGURĂ LINIE, fără \\n. Returnează DOAR JSON-ul.`

    // 4. Generate the content via AI
    const aiResponse = await callAI(systemPrompt, userPrompt)
    const parsed = parseAIJson(aiResponse)

    if (!parsed.title || !parsed.content) {
      throw new Error("AI response missing required fields (title/content)")
    }

    // 5. Build blog post object
    const blogPost: GeneratedBlogPost = {
      title: parsed.title,
      slug: generateSlug(parsed.title),
      excerpt: parsed.excerpt || parsed.title,
      content: parsed.content,
      seo_title: parsed.seo_title || parsed.title,
      seo_description: parsed.seo_description || parsed.excerpt,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [product.brand || "echipamente"]
    }

    // 6. Pick a random blog category
    const blogCategory = await pickRandomBlogCategory()

    // 7. Save to database with product image and product link
    const postId = crypto.randomUUID()

    await pool.query(
      `INSERT INTO blog_posts (
        id, title, slug, excerpt, content, featured_image,
        category, tags, seo_title, seo_description,
        author, status, is_auto_generated, related_product_ids,
        created_at, updated_at, published_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        NOW(), NOW(), NOW()
      )`,
      [
        postId,
        blogPost.title,
        blogPost.slug,
        blogPost.excerpt,
        blogPost.content,
        product.image_url,  // Use the actual product image
        blogCategory,
        blogPost.tags,
        blogPost.seo_title,
        blogPost.seo_description,
        "Admin Statii Info Trafic",
        "published",
        true,
        [product.id]  // Track which product this blog is about
      ]
    )

    console.log(`[AutoBlog] Published: "${blogPost.title}" with image ${product.image_url}`)

    return {
      success: true,
      postId,
      productTitle: product.title,
      blogTitle: blogPost.title
    }
  } catch (error: any) {
    console.error("[AutoBlog] Generation failed:", error)
    return {
      success: false,
      error: error.message || "Unknown error"
    }
  }
}

// Pick a random blog category from the database
async function pickRandomBlogCategory(): Promise<string> {
  try {
    const result = await pool.query(
      "SELECT name FROM blog_categories ORDER BY RANDOM() LIMIT 1"
    )
    return result.rows.length > 0 ? result.rows[0].name : "Recenzii"
  } catch {
    return "Recenzii"
  }
}

// ===== Legacy functions (kept for manual/API usage) =====

// Generate blog post using AI (topic-based, manual)
export async function generateBlogPost(request: BlogGenerationRequest): Promise<GeneratedBlogPost> {
  const { topic, category, keywords = [], tone = "informativ", length = "mediu" } = request
  
  const lengthGuide = {
    scurt: "500-700 cuvinte",
    mediu: "800-1200 cuvinte", 
    lung: "1500-2000 cuvinte"
  }
  
  const systemPrompt = `Ești un expert în echipamente de comunicații radio CB, VHF, UHF și PMR. 
Scrii articole pentru un magazin online din România care vinde stații radio și accesorii.
Scrie DOAR în limba română, folosind diacritice corecte (ă, â, î, ș, ț).
Folosește un ton profesional dar accesibil, optimizat pentru SEO.`

  const userPrompt = `Generează un articol de blog complet în limba română despre: "${topic}"

Categoria: ${category}
Cuvinte cheie: ${keywords.join(", ") || "stații CB, comunicații radio, România"}
Tonul: ${tone} | Lungime: ${lengthGuide[length]}

Returnează EXACT acest format JSON (fără text suplimentar):
{
  "title": "Titlu max 70 caractere, SEO friendly",
  "excerpt": "Rezumat 150-160 caractere",
  "content": "HTML complet pe o singură linie cu <h2>, <h3>, <p>, <ul>, <li>, <strong>.",
  "seo_title": "Titlu SEO max 60 caractere",
  "seo_description": "Meta description max 155 caractere",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANT: conținut HTML pe o SINGURĂ LINIE. Returnează DOAR JSON-ul.`

  const aiResponse = await callAI(systemPrompt, userPrompt)
  const parsed = parseAIJson(aiResponse)
  
  if (!parsed.title || !parsed.content) {
    throw new Error("AI response missing required fields")
  }
  
  return {
    title: parsed.title,
    slug: generateSlug(parsed.title),
    excerpt: parsed.excerpt || parsed.title,
    content: parsed.content,
    seo_title: parsed.seo_title || parsed.title,
    seo_description: parsed.seo_description || parsed.excerpt,
    tags: Array.isArray(parsed.tags) ? parsed.tags : []
  }
}

// Save blog post to database (legacy/manual)
export async function saveBlogPost(post: GeneratedBlogPost, category: string): Promise<string> {
  const id = crypto.randomUUID()
  
  await pool.query(
    `INSERT INTO blog_posts (
      id, title, slug, excerpt, content,
      category, tags, seo_title, seo_description,
      author, status, is_auto_generated, 
      created_at, updated_at, published_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      NOW(), NOW(), NOW()
    )`,
    [
      id, post.title, post.slug, post.excerpt, post.content,
      category, post.tags, post.seo_title, post.seo_description,
      "Admin Statii Info Trafic", "published", true
    ]
  )
  
  return id
}

// Generate and save (legacy/manual)
export async function generateAndSaveBlogPost(request: BlogGenerationRequest): Promise<{
  success: boolean
  postId?: string
  post?: GeneratedBlogPost
  error?: string
}> {
  try {
    const post = await generateBlogPost(request)
    const postId = await saveBlogPost(post, request.category)
    return { success: true, postId, post }
  } catch (error: any) {
    console.error("Blog generation failed:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}

// Get blog categories from database
export async function getBlogCategoriesForGenerator(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const result = await pool.query("SELECT id, name, slug FROM blog_categories ORDER BY name")
  return result.rows
}

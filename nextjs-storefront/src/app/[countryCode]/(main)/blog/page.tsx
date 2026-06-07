import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getBlogPosts, getBlogCategories, BlogPost } from "@lib/data/blog"

export const metadata: Metadata = {
  title: "Blog | Stații InfoTrafic",
  description: "Ultimele știri, ghiduri și recenzii despre echipamente de comunicații radio CB, VHF, UHF și PMR.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/blog",
  },
}

// Format date in Romanian
function formatDate(date: Date | string | null): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

// Blog card component
function BlogCard({ post }: { post: BlogPost }) {
  return (
    <LocalizedClientLink href={`/blog/${post.slug}`} className="group">
      <article className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl h-full flex flex-col">
        {/* Featured Image */}
        <div className="aspect-video bg-dark-700 relative overflow-hidden">
          {post.featured_image ? (
            <img 
              src={post.featured_image} 
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-primary-600/10">
              <svg className="w-16 h-16 text-primary-400/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
          )}
          
          {/* Category Badge */}
          {post.category && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 bg-primary-500/90 text-white text-xs font-medium rounded-full">
                {post.category}
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {/* Date */}
          <div className="flex items-center gap-2 text-dark-400 text-xs mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(post.published_at)}</span>
          </div>
          
          {/* Title */}
          <h2 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
            {post.title}
          </h2>
          
          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-dark-400 text-sm line-clamp-3 flex-1 mb-4">
              {post.excerpt}
            </p>
          )}
          
          {/* Read More */}
          <div className="flex items-center text-primary-400 text-sm font-medium mt-auto">
            <span>Citește mai mult</span>
            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </article>
    </LocalizedClientLink>
  )
}

type PageProps = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function BlogPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = parseInt(searchParams.page || "1")
  const category = searchParams.category
  const limit = 9
  const offset = (page - 1) * limit
  
  const { posts, total } = await getBlogPosts({ limit, offset, category })
  const categories = await getBlogCategories()
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-dark-900 min-h-screen py-8">
      <div className="content-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
          <p className="text-dark-400">Știri, ghiduri și recenzii despre echipamente de comunicații radio</p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <LocalizedClientLink
            href="/blog"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !category 
                ? "bg-primary-500 text-white" 
                : "bg-dark-800 text-dark-300 hover:text-white border border-dark-700 hover:border-primary-500"
            }`}
          >
            Toate
          </LocalizedClientLink>
          {categories.map((cat) => (
            <LocalizedClientLink
              key={cat.id}
              href={`/blog?category=${cat.slug}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.slug 
                  ? "bg-primary-500 text-white" 
                  : "bg-dark-800 text-dark-300 hover:text-white border border-dark-700 hover:border-primary-500"
              }`}
            >
              {cat.name}
            </LocalizedClientLink>
          ))}
        </div>

        {/* Blog Posts Grid */}
        {posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {page > 1 && (
                  <LocalizedClientLink
                    href={`/blog?page=${page - 1}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:border-primary-500 transition-colors"
                  >
                    Anterior
                  </LocalizedClientLink>
                )}
                
                <span className="px-4 py-2 text-dark-400">
                  Pagina {page} din {totalPages}
                </span>
                
                {page < totalPages && (
                  <LocalizedClientLink
                    href={`/blog?page=${page + 1}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Următorul
                  </LocalizedClientLink>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">Nu există articole</h3>
            <p className="text-dark-400">
              {category 
                ? "Nu există articole în această categorie încă." 
                : "Blogul nu are încă articole publicate. Revino curând!"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

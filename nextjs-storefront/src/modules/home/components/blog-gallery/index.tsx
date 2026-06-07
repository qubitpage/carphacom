import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { getRecentBlogPosts, BlogPost } from "@lib/data/blog"

// Format date in Romanian
function formatDate(date: Date | string | null): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short"
  })
}

const BlogGallery = async () => {
  const posts = await getRecentBlogPosts(4)
  
  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <section className="bg-dark-900 py-8">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <h2 className="text-xl font-bold text-white">Din Blog</h2>
          </div>
          <LocalizedClientLink 
            href="/blog"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 min-h-[44px]"
          >
            Vezi toate articolele
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>

        {/* Blog Cards Grid - Compact */}
        <div className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-2 medium:grid-cols-4 gap-4">
          {posts.map((post) => (
            <LocalizedClientLink 
              key={post.id} 
              href={`/blog/${post.slug}`}
              className="group"
            >
              <article className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-colors duration-300 h-full">
                {/* Image */}
                <div className="aspect-[16/10] bg-dark-700 relative overflow-hidden">
                  {post.featured_image ? (
                    <Image 
                      src={post.featured_image} 
                      alt={post.title}
                      width={400}
                      height={250}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                      <svg className="w-10 h-10 text-blue-400/50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  {post.category && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-blue-500/90 text-white text-[10px] font-medium rounded">
                        {post.category}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-3">
                  <div className="text-dark-300 text-[10px] mb-1">
                    {formatDate(post.published_at)}
                  </div>
                  <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">
                    {post.title}
                  </h3>
                </div>
              </article>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogGallery

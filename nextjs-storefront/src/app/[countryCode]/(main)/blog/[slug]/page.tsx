import { Metadata } from "next"
import { notFound } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getBlogPostBySlug, getRelatedBlogPosts, BlogPost } from "@lib/data/blog"
import DOMPurify from "isomorphic-dompurify"

type PageProps = {
  params: Promise<{ countryCode: string; slug: string }>
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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const post = await getBlogPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: "Articol negăsit | Stații InfoTrafic"
    }
  }
  
  return {
    title: post.seo_title || `${post.title} | Stații InfoTrafic`,
    description: post.seo_description || post.excerpt || `Citește ${post.title} pe blogul Stații InfoTrafic`,
    alternates: {
      canonical: `https://statiiinfotrafic.ro/ro/blog/${params.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || "",
      images: post.featured_image ? [post.featured_image] : [],
      url: `https://statiiinfotrafic.ro/ro/blog/${params.slug}`,
    }
  }
}

// Related post card
function RelatedPostCard({ post }: { post: BlogPost }) {
  return (
    <LocalizedClientLink href={`/blog/${post.slug}`} className="group">
      <article className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-primary-500/50 transition-all duration-300">
        <div className="aspect-video bg-dark-700 relative">
          {post.featured_image ? (
            <img 
              src={post.featured_image} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-primary-600/10">
              <svg className="w-10 h-10 text-primary-400/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
            {post.title}
          </h3>
          <p className="text-xs text-dark-400 mt-1">{formatDate(post.published_at)}</p>
        </div>
      </article>
    </LocalizedClientLink>
  )
}

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params
  const post = await getBlogPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }
  
  const relatedPosts = await getRelatedBlogPosts(post.id, post.category, 3)

  return (
    <div className="bg-dark-900 min-h-screen py-8">
      <div className="content-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-dark-400 mb-6">
          <LocalizedClientLink href="/" className="hover:text-white transition-colors">
            Acasă
          </LocalizedClientLink>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <LocalizedClientLink href="/blog" className="hover:text-white transition-colors">
            Blog
          </LocalizedClientLink>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white truncate max-w-xs">{post.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <article className="lg:col-span-2">
            {/* Featured Image */}
            {post.featured_image && (
              <div className="aspect-video rounded-xl overflow-hidden mb-6">
                <img 
                  src={post.featured_image} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {post.category && (
                <LocalizedClientLink 
                  href={`/blog?category=${post.category}`}
                  className="px-3 py-1 bg-primary-500/20 text-primary-400 text-sm font-medium rounded-full hover:bg-primary-500/30 transition-colors"
                >
                  {post.category}
                </LocalizedClientLink>
              )}
              <div className="flex items-center gap-2 text-dark-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(post.published_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-dark-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{post.view_count} vizualizări</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {post.title}
            </h1>

            {/* Content */}
            <div 
              className="prose prose-invert prose-lg max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-p:text-dark-300 prose-p:leading-relaxed
                prose-a:text-primary-400 prose-a:no-underline hover:prose-a:text-primary-300
                prose-strong:text-white
                prose-ul:text-dark-300 prose-ol:text-dark-300
                prose-li:marker:text-primary-400
                prose-blockquote:border-primary-500 prose-blockquote:text-dark-400
                prose-code:text-primary-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:rounded
                prose-pre:bg-dark-800 prose-pre:border prose-pre:border-dark-700"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || "", { ALLOW_DATA_ATTR: false }) }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-dark-700">
                <span className="text-dark-400 text-sm">Etichete:</span>
                {post.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-dark-800 text-dark-300 text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author */}
            <div className="mt-8 p-6 bg-dark-800 border border-dark-700 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">{post.author}</p>
                  <p className="text-dark-400 text-sm">Admin Statii Info Trafic</p>
                </div>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Articole Similare</h3>
                <div className="space-y-4">
                  {relatedPosts.map((related) => (
                    <RelatedPostCard key={related.id} post={related} />
                  ))}
                </div>
              </div>
            )}

            {/* CTA Box */}
            <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Ai nevoie de ajutor?</h3>
              <p className="text-dark-300 text-sm mb-4">
                Contactează-ne pentru sfaturi personalizate despre alegerea echipamentului potrivit.
              </p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Vezi Produsele
              </LocalizedClientLink>
            </div>
          </aside>
        </div>

        {/* Back to Blog */}
        <div className="mt-10 pt-8 border-t border-dark-700">
          <LocalizedClientLink
            href="/blog"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Înapoi la Blog
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

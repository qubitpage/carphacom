import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { COMPANY, PROJECTS } from "qubitpage/data"
import { fmtDate, getProject, getReadmeHtml } from "qubitpage/github"
import { Cta, Icon, Lang } from "qubitpage/ui"

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) return { title: "Project not found" }
  return {
    title: p.name,
    description: p.tagline,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: `${p.name} · Qubitpage`, description: p.tagline, images: p.image ? [{ url: p.image }] : undefined },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) notFound()
  const readme = await getReadmeHtml(p.slug, p.repo?.defaultBranch || "main")
  const repoUrl = p.repo?.url || `${COMPANY.github}/${p.slug}`
  return (
    <>
      <section className="qp-page-head">
        <div className="qp-wrap">
          <p style={{ fontSize: 14, marginTop: 0, marginBottom: 14 }}><Link href="/projects" style={{ color: "var(--muted)" }}>← All projects</Link></p>
          <div className="qp-proj-head">
            <div>
              <div className="qp-chips" style={{ marginBottom: 14 }}>
                <span className="qp-chip">{p.category}</span>
                {p.award ? <span className="qp-chip award">🏆 {p.award}</span> : null}
              </div>
              <h1>{p.name}</h1>
              <p>{p.tagline}</p>
            </div>
            <div className="qp-proj-actions">
              <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="qp-btn primary"><Icon name="github" size={18} /> View on GitHub</a>
              {(p.links || []).slice(0, 1).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="qp-btn">{l.label} <Icon name="external" size={16} /></a>
              ))}
            </div>
          </div>
          {p.repo ? (
            <div className="qp-facts">
              {p.repo.language ? <span>Language <b><Lang name={p.repo.language} /></b></span> : null}
              <span>Stars <b>{p.repo.stars}</b></span>
              <span>Forks <b>{p.repo.forks}</b></span>
              <span>Last update <b>{fmtDate(p.repo.pushedAt)}</b></span>
            </div>
          ) : null}
        </div>
      </section>
      <section style={{ paddingBottom: 30 }}>
        <div className="qp-wrap qp-layout">
          <div style={{ minWidth: 0 }}>
            {p.image ? <img src={p.image} alt={`${p.name} preview`} style={{ borderRadius: 16, border: "1px solid var(--line)", marginBottom: 22 }} /> : null}
            {readme ? (
              <article className="qp-readme" dangerouslySetInnerHTML={{ __html: readme }} />
            ) : (
              <article className="qp-readme">
                <p>{p.summary}</p>
                <p><a href={repoUrl} target="_blank" rel="noopener noreferrer">Read the full README on GitHub →</a></p>
              </article>
            )}
          </div>
          <aside className="qp-aside">
            <div className="qp-card">
              <h3>Overview</h3>
              <p>{p.summary}</p>
            </div>
            {p.highlights.length ? (
              <div className="qp-card">
                <h3>Highlights</h3>
                <ul className="qp-list" style={{ marginTop: 4 }}>{p.highlights.map((h) => <li key={h} style={{ fontSize: 14 }}>{h}</li>)}</ul>
              </div>
            ) : null}
            <div className="qp-card">
              <h3>Built with</h3>
              <div className="qp-chips">{[...new Set([...p.tech, ...(p.repo?.topics || [])])].slice(0, 14).map((t) => <span key={t} className="qp-chip">{t}</span>)}</div>
            </div>
            {(p.links || []).length ? (
              <div className="qp-card">
                <h3>Links</h3>
                <ul className="qp-list" style={{ marginTop: 4 }}>
                  {(p.links || []).map((l) => <li key={l.url} style={{ fontSize: 14 }}><a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>{l.label}</a></li>)}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
      <Cta />
    </>
  )
}

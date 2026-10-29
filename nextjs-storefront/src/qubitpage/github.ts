import "server-only"
import DOMPurify from "isomorphic-dompurify"
import { COMPANY, PROJECTS, Project } from "./data"

// Live data from the GitHub API, cached for an hour (ISR). Works without a token (60 requests/hour per IP);
// set GITHUB_TOKEN on the server for higher limits. If GitHub is unreachable the curated data is used.

export interface RepoInfo {
  name: string
  description: string
  language: string | null
  topics: string[]
  stars: number
  forks: number
  updatedAt: string
  pushedAt: string
  url: string
  homepage: string | null
  defaultBranch: string
  archived: boolean
}

export interface SiteProject extends Project {
  repo?: RepoInfo
}

const API = "https://api.github.com"
const headers = (): Record<string, string> => {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "qubitpage.com" }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

export async function getRepos(): Promise<RepoInfo[]> {
  try {
    const res = await fetch(`${API}/orgs/${COMPANY.githubOrg}/repos?per_page=100&type=public&sort=pushed`, {
      headers: headers(),
      next: { revalidate: 3600, tags: ["github-repos"] },
    })
    if (!res.ok) return []
    const list = (await res.json()) as any[]
    return list
      .filter((r) => !r.private && r.name !== ".github")
      .map((r) => ({
        name: r.name,
        description: r.description || "",
        language: r.language,
        topics: r.topics || [],
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        updatedAt: r.updated_at,
        pushedAt: r.pushed_at,
        url: r.html_url,
        homepage: r.homepage || null,
        defaultBranch: r.default_branch || "main",
        archived: !!r.archived,
      }))
  } catch {
    return []
  }
}

// Curated projects (in their order) merged with live repo data, then any other public repos.
export async function getProjects(): Promise<SiteProject[]> {
  const repos = await getRepos()
  const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]))
  const out: SiteProject[] = PROJECTS.map((p) => ({ ...p, repo: byName.get(p.slug.toLowerCase()) }))
  for (const r of repos) {
    if (out.some((p) => p.slug.toLowerCase() === r.name.toLowerCase())) continue
    out.push({
      slug: r.name,
      name: r.name,
      category: "Infrastructure",
      tagline: r.description || "Open-source project by Qubitpage.",
      summary: r.description || "",
      highlights: [],
      tech: [r.language, ...r.topics].filter(Boolean).slice(0, 6) as string[],
      repo: r,
    })
  }
  return out
}

export async function getProject(slug: string): Promise<SiteProject | null> {
  const all = await getProjects()
  const p = all.find((x) => x.slug.toLowerCase() === slug.toLowerCase())
  if (p) return p
  return null
}

// README rendered to HTML by GitHub, sanitised, with relative links and images made absolute.
export async function getReadmeHtml(slug: string, branch = "main"): Promise<string | null> {
  try {
    const res = await fetch(`${API}/repos/${COMPANY.githubOrg}/${slug}/readme`, {
      headers: { ...headers(), Accept: "application/vnd.github.html+json" },
      next: { revalidate: 3600, tags: [`readme-${slug}`] },
    })
    if (!res.ok) return null
    let html = await res.text()
    const rawBase = `https://raw.githubusercontent.com/${COMPANY.githubOrg}/${slug}/${branch}/`
    const blobBase = `https://github.com/${COMPANY.githubOrg}/${slug}/blob/${branch}/`
    const abs = (u: string, base: string) => (/^(https?:|data:|mailto:|#)/i.test(u) ? u : base + u.replace(/^\.?\//, ""))
    html = html
      .replace(/(<img[^>]*?\ssrc=")([^"]+)"/gi, (_m, a, u) => `${a}${abs(u, rawBase)}"`)
      .replace(/(<a[^>]*?\shref=")([^"]+)"/gi, (_m, a, u) => `${a}${abs(u, blobBase)}"`)
    const clean = DOMPurify.sanitize(html, {
      FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button"],
      FORBID_ATTR: ["style", "onerror", "onclick"],
      ADD_ATTR: ["target", "rel"],
    })
    // open external links in a new tab
    return clean.replace(/<a (?![^>]*target=)/gi, '<a target="_blank" rel="noopener noreferrer" ')
  } catch {
    return null
  }
}

export { fmtDate } from "./data"

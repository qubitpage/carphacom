import Link from "next/link"
import { COMPANY, fmtDate } from "./data"
import type { SiteProject } from "./github"

export function AtomMark({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="qpmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00d4ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#qpmark)" strokeWidth="3">
        <ellipse cx="32" cy="32" rx="28" ry="11" />
        <ellipse cx="32" cy="32" rx="28" ry="11" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="28" ry="11" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="6" fill="#00d4ff" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="qp-logo" aria-label="Qubitpage — home">
      <AtomMark />
      <span>
        Qubitpage<span style={{ color: "var(--cyan)" }}>®</span>
        <small>LIMITED</small>
      </span>
    </Link>
  )
}

const PATHS: Record<string, string> = {
  code: "M8 6 2 12l6 6M16 6l6 6-6 6M14 4l-4 16",
  agent: "M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4ZM9 13h.01M15 13h.01M9 17h6",
  robot: "M12 3v3M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3ZM9 11v2M15 11v2M8 21h8M2 12h2M20 12h2",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  atom: "M12 12m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M12 2c3 0 5 4.5 5 10s-2 10-5 10-5-4.5-5-10 2-10 5-10ZM3.3 7c1.5-2.6 6.4-2 11.2.8s7.7 6.6 6.2 9.2-6.4 2-11.2-.8S1.8 9.6 3.3 7Z",
  github: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-6.9a5.4 5.4 0 0 0-1.5-3.7 5 5 0 0 0-.1-3.8s-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C6.3 1.6 5.1 2 5.1 2a5 5 0 0 0-.1 3.8A5.4 5.4 0 0 0 3.5 9.5c0 5.4 3.3 6.5 6.4 6.9a3.4 3.4 0 0 0-.9 2.6V22",
  arrow: "M5 12h14M13 6l6 6-6 6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 1 8 7 8-7",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  shield: "M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  server: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
}
export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.code} />
    </svg>
  )
}

const CAT_ICON: Record<string, string> = { Robotics: "robot", "AI agents": "agent", "E-commerce": "cart", Infrastructure: "server", "Quantum & research": "atom", Security: "shield", Accessibility: "eye" }
const LANG_COLORS: Record<string, string> = { TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", "C++": "#f34b7d", Go: "#00ADD8", Rust: "#dea584", GDScript: "#355570" }
export function Lang({ name }: { name?: string | null }) {
  if (!name) return null
  return <span className="qp-lang" style={{ ["--c" as any]: LANG_COLORS[name] || "#94a3b8" }}>{name}</span>
}

export function ProjectCard({ p, cover = false }: { p: SiteProject; cover?: boolean }) {
  return (
    <Link href={`/projects/${p.slug}`} className="qp-card">
      {cover ? (
        p.image ? (
          <div className="cover">
            <img src={p.image} alt={`${p.name} preview`} loading="lazy" />
          </div>
        ) : (
          <div className="cover gen" data-cat={p.category} aria-hidden="true">
            <Icon name={CAT_ICON[p.category] || "code"} size={56} />
            <span>{p.category}</span>
          </div>
        )
      ) : null}
      <div className="qp-chips">
        <span className="qp-chip">{p.category}</span>
        {p.award ? <span className="qp-chip award">🏆 {p.award.replace(/ — .*/, "")}</span> : null}
      </div>
      <h3>{p.name}</h3>
      <p>{p.tagline}</p>
      <div className="meta">
        <Lang name={p.repo?.language} />
        {p.repo ? (
          <span title="GitHub stars" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <Icon name="star" size={14} /> {p.repo.stars}
          </span>
        ) : null}
        {p.repo?.pushedAt ? <span>Updated {fmtDate(p.repo.pushedAt)}</span> : null}
      </div>
    </Link>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="qp-footer">
      <div className="qp-wrap">
        <div className="cols">
          <div>
            <Logo />
            <p style={{ marginTop: 14, maxWidth: 360 }}>
              Software development, AI agents and robotics — from quantum research to robots you can talk to. Based in {COMPANY.country}.
            </p>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h4>Work</h4>
            <ul>
              <li><Link href="/projects">All projects</Link></li>
              <li><Link href="/robotics">Robotics</Link></li>
              <li><Link href="/#services">Services</Link></li>
            </ul>
          </div>
          <div>
            <h4>Connect</h4>
            <ul>
              <li><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></li>
              <li><a href={COMPANY.github} target="_blank" rel="noopener noreferrer">github.com/qubitpage</a></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {year} {COMPANY.name}. All rights reserved.</span>
          <span>{COMPANY.trademark}</span>
        </div>
      </div>
    </footer>
  )
}

export function Cta() {
  return (
    <section className="qp-section">
      <div className="qp-wrap">
        <div className="qp-cta">
          <div style={{ position: "relative" }}>
            <h2>Have a product, an agent or a robot in mind?</h2>
            <p>Tell us what you want to build — software, AI agents, e-commerce or robotics.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", position: "relative" }}>
            <Link href="/contact" className="qp-btn primary">Start a conversation <Icon name="arrow" size={18} /></Link>
            <a href={COMPANY.github} target="_blank" rel="noopener noreferrer" className="qp-btn"><Icon name="github" size={18} /> GitHub</a>
          </div>
        </div>
      </div>
    </section>
  )
}

import Link from "next/link"
import { ACHIEVEMENTS, COMPANY, SERVICES } from "qubitpage/data"
import { getProjects } from "qubitpage/github"
import { Cta, Icon, ProjectCard } from "qubitpage/ui"

export const revalidate = 3600
export const metadata = { alternates: { canonical: "/" } }

function Orbit() {
  return (
    <svg className="qp-orbit" viewBox="0 0 400 400" role="img" aria-label="Qubitpage atom">
      <defs>
        <linearGradient id="qpg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00d4ff" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        <linearGradient id="qpg2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a855f7" /><stop offset="1" stopColor="#00d4ff" /></linearGradient>
        <radialGradient id="qpcore"><stop offset="0" stopColor="#7ee8ff" /><stop offset="1" stopColor="#00a3cc" /></radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeOpacity="0.07" />
      <g className="ring r1"><ellipse cx="200" cy="200" rx="180" ry="66" /><circle className="dot" cx="380" cy="200" r="7" /></g>
      <g className="ring r2"><ellipse cx="200" cy="200" rx="180" ry="66" transform="rotate(60 200 200)" /><circle className="dot" cx="290" cy="356" r="6" /></g>
      <g className="ring r3"><ellipse cx="200" cy="200" rx="180" ry="66" transform="rotate(120 200 200)" /><circle className="dot" cx="110" cy="356" r="5" /></g>
      <circle cx="200" cy="200" r="30" fill="url(#qpcore)" />
      <circle cx="200" cy="200" r="46" fill="none" stroke="#00d4ff" strokeOpacity="0.25" />
    </svg>
  )
}

export default async function Home() {
  const projects = await getProjects()
  const featured = projects.filter((p) => p.featured)
  const others = projects.filter((p) => !p.featured)
  const robot = projects.find((p) => p.slug === "carpathron-muse")
  return (
    <>
      <section className="qp-hero">
        <div className="qp-wrap">
          <div>
            <span className="qp-eyebrow">{COMPANY.name}</span>
            <h1>
              Software, AI agents <br />and <span className="qp-grad-text">robots</span> — built end to end.
            </h1>
            <p className="lead">
              We design and build software products, autonomous AI agents and robotics: from robots you can talk to and drive in VR, to commerce platforms, developer tools and quantum software.
            </p>
            <div className="ctas">
              <Link href="/projects" className="qp-btn primary">Explore our projects <Icon name="arrow" size={18} /></Link>
              <Link href="/contact" className="qp-btn">Work with us</Link>
            </div>
            <div className="qp-chips">
              <span className="qp-chip award">🥇 1st place · lablab.ai AI Meets Robotics 2026</span>
              <span className="qp-chip">Meta Global AI Developer Hackathon 2026</span>
              <span className="qp-chip">{projects.length} open-source projects</span>
            </div>
          </div>
          <Orbit />
        </div>
      </section>

      <section className="qp-section alt" id="services">
        <div className="qp-wrap">
          <div className="qp-section-head">
            <div>
              <span className="qp-eyebrow">What we do</span>
              <h2>From firmware to the cloud</h2>
              <p>One team across the whole stack — so the robot, the app, the agent and the server are designed to work together.</p>
            </div>
          </div>
          <div className="qp-grid five">
            {SERVICES.map((s) => (
              <div key={s.title} className="qp-card">
                <div className="qp-icon"><Icon name={s.icon} size={24} /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="qp-section">
        <div className="qp-wrap">
          <div className="qp-section-head">
            <div>
              <span className="qp-eyebrow">Featured work</span>
              <h2>Products we have built</h2>
              <p>Every project here is open source on GitHub — read the code, run it, or ask us to build on it for you.</p>
            </div>
            <Link href="/projects" className="qp-btn small">All projects <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="qp-grid">
            {featured.map((p) => <ProjectCard key={p.slug} p={p} cover />)}
          </div>
        </div>
      </section>

      {robot ? (
        <section className="qp-section alt">
          <div className="qp-wrap qp-band">
            <div>
              <span className="qp-eyebrow">Robotics</span>
              <h2>Carpathron — robots you can talk to, drive and become</h2>
              <p>{robot.summary}</p>
              <ul className="qp-list">
                {robot.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
              </ul>
              <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                <Link href="/robotics" className="qp-btn primary">Our robotics work <Icon name="arrow" size={18} /></Link>
                <Link href="/projects/carpathron-muse" className="qp-btn">Project details</Link>
              </div>
            </div>
            {robot.image ? <img src={robot.image} alt="Carpathron — robots you can talk to, drive and become" loading="lazy" /> : null}
          </div>
        </section>
      ) : null}

      <section className="qp-section">
        <div className="qp-wrap">
          <div className="qp-section-head">
            <div>
              <span className="qp-eyebrow">Track record</span>
              <h2>Recognition & research</h2>
            </div>
          </div>
          <div className="qp-stats">
            {ACHIEVEMENTS.map((a) => (
              <a key={a.label} href={a.url} target="_blank" rel="noopener noreferrer" className="qp-stat">
                <b className="qp-grad-text">{a.value}</b>
                <span>{a.label}</span>
              </a>
            ))}
            <Link href="/projects" className="qp-stat">
              <b className="qp-grad-text">{projects.length}</b>
              <span>public repositories on github.com/qubitpage</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="qp-section alt">
        <div className="qp-wrap">
          <div className="qp-section-head">
            <div>
              <span className="qp-eyebrow">Open source</span>
              <h2>More from our lab</h2>
              <p>AI agents, security, accessibility, infrastructure and quantum research.</p>
            </div>
          </div>
          <div className="qp-grid">
            {others.map((p) => <ProjectCard key={p.slug} p={p} />)}
          </div>
        </div>
      </section>

      <Cta />
    </>
  )
}

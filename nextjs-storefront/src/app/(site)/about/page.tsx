import type { Metadata } from "next"
import Link from "next/link"
import { COMPANY } from "qubitpage/data"
import { getProjects } from "qubitpage/github"
import { Cta, Icon } from "qubitpage/ui"

export const revalidate = 3600
export const metadata: Metadata = {
  title: "About",
  description: "Qubitpage LIMITED is a software development and robotics company from Romania, building AI agents, robots, commerce platforms and quantum software.",
  alternates: { canonical: "/about" },
}

const STACK = ["TypeScript", "Next.js", "Node.js", "Electron", "Python", "MedusaJS", "PostgreSQL", "Docker", "Meta Muse", "Google Gemini", "NVIDIA Isaac Sim", "Qiskit / IBM Quantum", "Godot 4 / OpenXR", "ESP32 / Arduino"]

const RESEARCH = [
  ["IBM Quantum hardware", "IBM Fez (156 qubits), IBM Torino, IBM Marrakesh"],
  ["Bell-state fidelity", "99.80% reported via the QuBIOS Transit Ring"],
  ["Drug-discovery research", "13 candidate molecules reported by the QubitPage® OS research pipeline"],
  ["Quantum OS", "20 desktop apps running in the browser"],
]

export default async function AboutPage() {
  const projects = await getProjects()
  return (
    <>
      <section className="qp-page-head">
        <div className="qp-wrap">
          <span className="qp-eyebrow">About</span>
          <h1>{COMPANY.name}</h1>
          <p>
            We are a software development and robotics company based in {COMPANY.country}. We build products across the whole stack — firmware, apps, AI agents, servers and research — and we publish our work as open source on GitHub.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: 30 }}>
        <div className="qp-wrap qp-grid">
          <div className="qp-card">
            <div className="qp-icon"><Icon name="code" /></div>
            <h3>Build it end to end</h3>
            <p>Robots, the apps that control them, the agents that reason for them and the servers behind them — designed together so they work together.</p>
          </div>
          <div className="qp-card">
            <div className="qp-icon"><Icon name="agent" /></div>
            <h3>Useful, honest AI</h3>
            <p>Agents that act with real tools, ask before risky steps and check their own work — with your choice of models and your keys.</p>
          </div>
          <div className="qp-card">
            <div className="qp-icon"><Icon name="github" /></div>
            <h3>Open by default</h3>
            <p>{projects.length} public repositories on github.com/qubitpage, with methods and limits documented — including in our research.</p>
          </div>
        </div>
      </section>

      <section className="qp-section alt">
        <div className="qp-wrap qp-band">
          <div>
            <span className="qp-eyebrow">Recognition</span>
            <h2>Hackathons we have built for</h2>
            <ul className="qp-list">
              <li><span><b>1st place</b> — lablab.ai AI Meets Robotics 2026, with CarphaCom Robotised (NVIDIA Isaac Sim + Google Gemini + MedusaJS)</span></li>
              <li><span>Meta Global AI Developer Hackathon 2026 (Startup track) — Carpathron</span></li>
              <li><span>AI Agent Olympics, Vultr track, Milan AI Week 2026 — Vultr Atlas + Omniverse</span></li>
              <li><span>IBM Bob Hackathon — Bob Sentinel security scanner</span></li>
            </ul>
          </div>
          <div className="qp-card">
            <h3>Research highlights</h3>
            <p className="qp-note">As reported in our public repositories.</p>
            <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
              {RESEARCH.map(([k, v]) => (
                <div key={k} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <b style={{ display: "block" }}>{k}</b>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="qp-section">
        <div className="qp-wrap">
          <div className="qp-section-head">
            <div>
              <span className="qp-eyebrow">Technology</span>
              <h2>What we work with</h2>
            </div>
            <Link href="/projects" className="qp-btn small">See it in our projects <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="qp-chips">{STACK.map((s) => <span key={s} className="qp-chip" style={{ fontSize: 14, padding: "7px 14px" }}>{s}</span>)}</div>
          <p className="qp-note" style={{ marginTop: 26 }}>{COMPANY.trademark}</p>
        </div>
      </section>
      <Cta />
    </>
  )
}

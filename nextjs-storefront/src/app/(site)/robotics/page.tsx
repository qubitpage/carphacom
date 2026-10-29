import type { Metadata } from "next"
import Link from "next/link"
import { getProject } from "qubitpage/github"
import { Cta, Icon } from "qubitpage/ui"

export const revalidate = 3600
export const metadata: Metadata = {
  title: "Robotics",
  description: "Carpathron — robots you can talk to, drive and become, powered by Meta Muse — and CarphaCom Robotised, 1st place at lablab.ai AI Meets Robotics 2026.",
  alternates: { canonical: "/robotics" },
}

const PARTS = [
  { title: "Muse Carpathron", sub: "Windows 10 / 11 / Server", text: "The brain and hub: a chat and agent on Meta Muse with tools, MCP, memory, WhatsApp text and voice commands, robot control and room mapping." },
  { title: "Carpathron Avatar", sub: "Meta Quest 3 / 3S", text: "A native OpenXR app: see through the robot's camera, drive with the controllers, turn your head and the robot turns, talk to Muse." },
  { title: "Baby Carpathron", sub: "ESP32-CAM robot car", text: "Live video, RC-style continuous driving, photos and Wi-Fi setup over the open Carpathron Robot Protocol." },
]

export default async function RoboticsPage() {
  const carp = await getProject("carpathron-muse")
  return (
    <>
      <section className="qp-page-head">
        <div className="qp-wrap">
          <span className="qp-eyebrow">Robotics</span>
          <h1>Robots you can talk to, drive and become</h1>
          <p>We build robotics end to end — firmware, an open robot protocol, desktop and VR control apps, voice and AI — and simulate warehouse robots with NVIDIA Isaac Sim.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 30 }}>
        <div className="qp-wrap qp-band">
          <div>
            <span className="qp-eyebrow">Carpathron · Meta Global AI Developer Hackathon 2026</span>
            <h2>One Muse brain, one open robot protocol, every way to reach your robot</h2>
            <p>{carp?.summary}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <a href="https://github.com/qubitpage/carpathron-muse#%EF%B8%8F-download" target="_blank" rel="noopener noreferrer" className="qp-btn primary">Download the apps <Icon name="external" size={16} /></a>
              <Link href="/projects/carpathron-muse" className="qp-btn">Project details</Link>
            </div>
          </div>
          {carp?.image ? <img src={carp.image} alt="Carpathron robots" /> : null}
        </div>
      </section>

      <section className="qp-section">
        <div className="qp-wrap">
          <div className="qp-grid">
            {PARTS.map((p) => (
              <div key={p.title} className="qp-card">
                <div className="qp-icon"><Icon name="robot" size={24} /></div>
                <h3>{p.title}</h3>
                <span className="qp-chip" style={{ alignSelf: "start" }}>{p.sub}</span>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="qp-section alt">
        <div className="qp-wrap qp-band">
          <div>
            <span className="qp-eyebrow">🥇 1st place · lablab.ai AI Meets Robotics 2026</span>
            <h2>CarphaCom Robotised — AI warehouse robotics</h2>
            <p>AI-powered warehouse robotics simulation that combines NVIDIA Isaac Sim, Google Gemini AI navigation and a full MedusaJS e-commerce backend — the project that took 1st place at the lablab.ai AI Meets Robotics 2026 hackathon.</p>
            <div className="qp-chips" style={{ marginTop: 18 }}>
              {["NVIDIA Isaac Sim", "Google Gemini AI", "MedusaJS", "Python", "ROS2"].map((t) => <span key={t} className="qp-chip">{t}</span>)}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <a href="https://lablab.ai/ai-hackathons/launch-fund-ai-meets-robotics" target="_blank" rel="noopener noreferrer" className="qp-btn primary">The hackathon <Icon name="external" size={16} /></a>
              <a href="https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce" target="_blank" rel="noopener noreferrer" className="qp-btn"><Icon name="github" size={18} /> Winning repo</a>
            </div>
          </div>
          <div className="qp-card" style={{ alignSelf: "stretch", justifyContent: "center" }}>
            <h3>What we build for robots</h3>
            <ul className="qp-list">
              <li>ESP32 / Arduino firmware, flashed and tested on real hardware</li>
              <li>An open HTTP + MJPEG robot protocol, so new robots plug into every app</li>
              <li>Control apps for Windows, phones, browsers and Meta Quest</li>
              <li>Voice and AI: Meta Muse, speech-to-text, vision and room mapping</li>
              <li>Simulation: NVIDIA Isaac Sim warehouse robotics</li>
            </ul>
          </div>
        </div>
      </section>
      <Cta />
    </>
  )
}

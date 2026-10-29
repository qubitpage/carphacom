import type { Metadata } from "next"
import { COMPANY } from "qubitpage/data"
import { Icon } from "qubitpage/ui"
import ContactForm from "qubitpage/contact-form"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Qubitpage LIMITED about software development, AI agents, e-commerce platforms or robotics.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <>
      <section className="qp-page-head">
        <div className="qp-wrap">
          <span className="qp-eyebrow">Contact</span>
          <h1>Let's talk about your project</h1>
          <p>Software, AI agents, e-commerce or robotics — tell us what you want to build.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 60 }}>
        <div className="qp-wrap qp-layout">
          <div className="qp-card" style={{ padding: 28 }}>
            <ContactForm />
          </div>
          <aside className="qp-aside">
            <a className="qp-card" href={`mailto:${COMPANY.email}`}>
              <div className="qp-icon"><Icon name="mail" /></div>
              <h3>Email</h3>
              <p>{COMPANY.email}</p>
            </a>
            <a className="qp-card" href={COMPANY.github} target="_blank" rel="noopener noreferrer">
              <div className="qp-icon"><Icon name="github" /></div>
              <h3>GitHub</h3>
              <p>github.com/qubitpage — all our open-source projects</p>
            </a>
            <div className="qp-card">
              <h3>{COMPANY.name}</h3>
              <p>{COMPANY.country}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}

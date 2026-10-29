import type { Metadata } from "next"
import { COMPANY } from "qubitpage/data"

export const metadata: Metadata = { title: "Privacy", description: "How Qubitpage LIMITED handles the information you send us.", alternates: { canonical: "/privacy" } }

export default function PrivacyPage() {
  return (
    <section className="qp-page-head" style={{ paddingBottom: 60 }}>
      <div className="qp-wrap" style={{ maxWidth: 820 }}>
        <span className="qp-eyebrow">Privacy</span>
        <h1>Privacy notice</h1>
        <div className="qp-readme" style={{ marginTop: 26 }}>
          <p>This website is operated by {COMPANY.name} ({COMPANY.country}).</p>
          <h2>Contact form</h2>
          <p>When you send the contact form we store your name, email address, optional company, topic and message so that we can answer you. We do not sell this information or use it for advertising. You can ask us to delete it at any time by writing to <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
          <h2>Cookies and analytics</h2>
          <p>The company pages of this website do not use advertising or analytics cookies. Technical cookies may be set by the server to keep the site working.</p>
          <h2>Project data</h2>
          <p>Project information (descriptions, stars, update dates, READMEs) is loaded from the public GitHub API for github.com/qubitpage.</p>
          <h2>Contact</h2>
          <p>Questions about this notice: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
        </div>
      </div>
    </section>
  )
}

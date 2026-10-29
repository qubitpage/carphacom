import Link from "next/link"
import { Icon } from "./ui"

export default function NotFoundView() {
  return (
    <section className="qp-page-head" style={{ minHeight: "56vh", display: "grid", alignItems: "center" }}>
      <div className="qp-wrap" style={{ textAlign: "center" }}>
        <span className="qp-eyebrow">404</span>
        <h1>This page does not exist</h1>
        <p style={{ margin: "14px auto 0" }}>The link may be old or mistyped.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 26, flexWrap: "wrap" }}>
          <Link href="/" className="qp-btn primary">Home <Icon name="arrow" size={18} /></Link>
          <Link href="/projects" className="qp-btn">Our projects</Link>
        </div>
      </div>
    </section>
  )
}

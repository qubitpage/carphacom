"use client"
import Link from "next/link"
import { useState } from "react"

export default function ContactForm() {
  const [state, setState] = useState<{ status: "idle" | "sending" | "ok" | "err"; msg?: string }>({ status: "idle" })
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    setState({ status: "sending" })
    try {
      const r = await fetch("/api/qp-contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error(j.error || "The message could not be sent.")
      form.reset()
      setState({ status: "ok", msg: "Thank you — your message was received. We will reply by email." })
    } catch (err: any) {
      setState({ status: "err", msg: `${err.message} You can also email contact@qubitpage.com.` })
    }
  }
  return (
    <form className="qp-form" onSubmit={onSubmit} noValidate={false}>
      <div className="row2">
        <label>Name<input name="name" required maxLength={120} autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
      </div>
      <div className="row2">
        <label>Company <span className="qp-note">(optional)</span><input name="company" maxLength={160} autoComplete="organization" /></label>
        <label>Topic
          <select name="topic" defaultValue="Software development">
            <option>Software development</option>
            <option>AI agents & automation</option>
            <option>Robotics & IoT</option>
            <option>E-commerce (CarphaCom)</option>
            <option>Quantum & research</option>
            <option>Something else</option>
          </select>
        </label>
      </div>
      <label>Message<textarea name="message" required minLength={10} maxLength={5000} placeholder="What would you like to build?" /></label>
      <label className="qp-hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <p className="qp-note">We use your details only to answer your message. See our <Link href="/privacy" style={{ textDecoration: "underline" }}>privacy notice</Link>.</p>
      {state.status === "ok" ? <div className="qp-alert ok" role="status">{state.msg}</div> : null}
      {state.status === "err" ? <div className="qp-alert err" role="alert">{state.msg}</div> : null}
      <div><button className="qp-btn primary" type="submit" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : "Send message"}</button></div>
    </form>
  )
}

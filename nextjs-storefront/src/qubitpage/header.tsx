"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Logo, Icon } from "./ui"

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/robotics", label: "Robotics" },
  { href: "/#services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export default function Header() {
  const path = usePathname() || "/"
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])
  return (
    <header className="qp-header">
      <div className="qp-wrap">
        <Logo />
        <button className="qp-menu-btn" aria-label="Menu" aria-expanded={open} aria-controls="qp-nav" onClick={() => setOpen((o) => !o)}>
          {open ? "✕" : "☰"}
        </button>
        <nav id="qp-nav" className={`qp-nav${open ? " open" : ""}`} aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.href !== "/#services" && path.startsWith(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
          <a href="https://github.com/qubitpage" target="_blank" rel="noopener noreferrer" className="qp-btn small" style={{ marginLeft: 8 }}>
            <Icon name="github" size={16} /> GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

"use client"
import { useMemo, useState } from "react"

// Category filter for the projects grid: the cards are rendered on the server and passed in as children.
export default function ProjectFilter({ categories, items }: { categories: string[]; items: { category: string; node: React.ReactNode; key: string }[] }) {
  const [cat, setCat] = useState("All")
  const shown = useMemo(() => (cat === "All" ? items : items.filter((i) => i.category === cat)), [cat, items])
  return (
    <>
      <div className="qp-filters" role="group" aria-label="Filter projects by category">
        {["All", ...categories].map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}{c !== "All" ? ` (${items.filter((i) => i.category === c).length})` : ` (${items.length})`}
          </button>
        ))}
      </div>
      <div className="qp-grid">{shown.map((i) => <div key={i.key} style={{ display: "contents" }}>{i.node}</div>)}</div>
    </>
  )
}

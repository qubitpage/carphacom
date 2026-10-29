import type { Metadata } from "next"
import { CATEGORIES } from "qubitpage/data"
import { getProjects } from "qubitpage/github"
import { Cta, ProjectCard } from "qubitpage/ui"
import ProjectFilter from "qubitpage/filter"

export const revalidate = 3600
export const metadata: Metadata = {
  title: "Projects",
  description: "All Qubitpage projects — robotics, AI agents, e-commerce, infrastructure, security and quantum software — open source on GitHub.",
  alternates: { canonical: "/projects" },
}

export default async function ProjectsPage() {
  const projects = await getProjects()
  const cats = CATEGORIES.filter((c) => projects.some((p) => p.category === c))
  return (
    <>
      <section className="qp-page-head">
        <div className="qp-wrap">
          <span className="qp-eyebrow">Projects</span>
          <h1>Software we have built</h1>
          <p>Every project is public on github.com/qubitpage. Stars, languages and update dates come live from GitHub.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 40 }}>
        <div className="qp-wrap">
          <ProjectFilter categories={cats} items={projects.map((p) => ({ key: p.slug, category: p.category, node: <ProjectCard p={p} cover /> }))} />
        </div>
      </section>
      <Cta />
    </>
  )
}

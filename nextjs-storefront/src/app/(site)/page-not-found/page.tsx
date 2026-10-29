import NotFoundView from "qubitpage/not-found-view"

export const metadata = { title: "Page not found", robots: { index: false } }

export default function SiteNotFound() {
  return <NotFoundView />
}

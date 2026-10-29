import { notFound } from "next/navigation"

// The old shop front is switched off unless SHOP_ENABLED=1. Known shop URLs are redirected by the middleware;
// anything else that lands on a [countryCode] route is an unknown address, so it gets the site's 404.
export default function CountryLayout({ children }: { children: React.ReactNode }) {
  if (process.env.SHOP_ENABLED !== "1") notFound()
  return children
}

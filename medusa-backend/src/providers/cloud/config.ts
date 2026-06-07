import type { ProviderSlug } from "./types"

export function marginPct(): number {
  const raw = Number(process.env.QP_DEFAULT_MARGIN_PCT || "18")
  if (!Number.isFinite(raw) || raw < 0 || raw > 500) return 18
  return raw
}

export function priceWithMargin(price?: number): number | undefined {
  if (price === undefined || !Number.isFinite(price)) return undefined
  return Math.round(price * (1 + marginPct() / 100) * 100) / 100
}

export function configured(name: string): boolean {
  const value = process.env[name]
  return Boolean(value && value.trim().length > 0)
}

export function maskConfigured(slug: ProviderSlug, keys: string[]): string[] {
  return keys.filter((key) => configured(key)).map((key) => `${slug}:${key}=configured`)
}

export function isoNow(): string {
  return new Date().toISOString()
}

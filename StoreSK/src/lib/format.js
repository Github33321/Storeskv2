export function money(cents) {
  const n = Number(cents || 0) / 100
  try {
    return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
  } catch {
    return `${Math.round(n)} ₽`
  }
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

export function firstImageFromProduct(product) {
  const v0 = product?.variants?.[0]
  const img = v0?.images?.[0]?.url
  return img || ''
}

export function minPriceFromProduct(product) {
  const vs = product?.variants || []
  if (!vs.length) return 0
  return vs.reduce((m, v) => (v.price_cents < m ? v.price_cents : m), vs[0].price_cents)
}

export function optionsLabel(variant) {
  const parts = [variant?.color, variant?.memory, variant?.connectivity].filter(Boolean)
  return parts.join(' / ')
}

// lib/api.js
const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const API = `${base}/api`

export function resolveUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/')) return `${base}${path}`
  return `${API}/${path}`
}

async function request(path, { method = 'GET', headers = {}, body, raw = false } = {}) {
  const url =
      path.startsWith('/api') || path.startsWith('/media') || path.startsWith('/')
          ? resolveUrl(path)
          : `${API}${path.startsWith('/') ? '' : '/'}${path}`

  const opts = {
    method,
    credentials: 'include', // ✅ чтобы cookie корзины работали
    headers: { ...headers }
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body
    } else {
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json'
      opts.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url, opts)
  if (raw) return res

  let data = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null)
  } else {
    data = await res.text().catch(() => null)
  }

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const api = {
  base,
  API,
  resolveUrl,

  health: () => request('/api/health'),

  categories: () => request('/api/categories'),

  products: (params = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.category) q.set('category', params.category)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    const qs = q.toString()
    return request(`/api/products${qs ? `?${qs}` : ''}`)
  },

  productBySlug: (slug) => request(`/api/products/${encodeURIComponent(slug)}`),

  cart: () => request('/api/cart'),
  cartAdd: (variant_id, qty = 1) => request('/api/cart/items', { method: 'POST', body: { variant_id, qty } }),
  cartSetQty: (itemId, qty) => request(`/api/cart/items/${itemId}`, { method: 'PATCH', body: { qty } }),
  cartDeleteItem: (itemId) => request(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
  cartClear: () => request('/api/cart/clear', { method: 'POST' }),

  checkout: (payload) => request('/api/checkout', { method: 'POST', body: payload })
}

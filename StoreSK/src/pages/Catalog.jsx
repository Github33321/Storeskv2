import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import ProductCard from '../components/ProductCard.jsx'
import CategoryPills from '../components/CategoryPills.jsx'
import Skeleton from '../components/Skeleton.jsx'

export default function Catalog() {
  const [sp, setSp] = useSearchParams()
  const q = (sp.get('q') || '').trim()
  const category = (sp.get('category') || '').trim()

  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const title = useMemo(() => {
    if (q) return `Поиск: “${q}”`
    if (!category) return 'Каталог'
    const c = cats.find((x) => x.slug === category || String(x.id) === String(category))
    return c ? c.name : 'Каталог'
  }, [q, category, cats])

  useEffect(() => {
    let alive = true
    api.categories().then((c) => alive && setCats(c)).catch(() => {})
    return () => { alive = false }
  }, [])

  async function fetchPage({ offset, append }) {
    setErr('')
    try {
      const page = await api.products({ q, category, limit: 12, offset })
      if (append) setItems((prev) => [...prev, ...page])
      else setItems(page)
      setDone(page.length < 12)
    } catch (e) {
      setErr(e.message || 'Ошибка загрузки')
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setDone(false)
      setItems([])
      await fetchPage({ offset: 0, append: false })
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category])

  async function onLoadMore() {
    setLoadingMore(true)
    await fetchPage({ offset: items.length, append: true })
    setLoadingMore(false)
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="section__head">
          <h1 className="h1">{title}</h1>
          <div className="right">
            <label className="muted">Поиск</label>
            <input
              className="input"
              value={q}
              onChange={(e) => {
                const v = e.target.value
                const next = new URLSearchParams(sp)
                if (v.trim()) next.set('q', v)
                else next.delete('q')
                setSp(next, { replace: true })
              }}
              placeholder="Например: iPhone 15"
            />
          </div>
        </div>

        <CategoryPills
          categories={cats}
          active={category}
          onPick={(slug) => {
            const next = new URLSearchParams(sp)
            if (slug) next.set('category', slug)
            else next.delete('category')
            setSp(next, { replace: true })
          }}
        />
      </section>

      {err && (
        <div className="alert">
          <strong>Ошибка:</strong> {err}
        </div>
      )}

      <section className="section">
        <div className="grid grid--products">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="skeleton--card" />)
            : items.map((p) => <ProductCard key={p.id} product={p} />)
          }
        </div>

        {!loading && !items.length && !err && (
          <div className="empty">
            <div className="empty__title">Ничего не нашли</div>
            <div className="muted">Попробуйте другой запрос или снимите фильтр по категории.</div>
          </div>
        )}

        {!loading && items.length > 0 && !done && (
          <div className="center">
            <button className="btn btn--ghost" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Загружаем…' : 'Показать ещё'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

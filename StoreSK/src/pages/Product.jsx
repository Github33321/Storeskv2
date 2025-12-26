import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { money, optionsLabel } from '../lib/format.js'
import QtyStepper from '../components/QtyStepper.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useCart } from '../lib/cart.jsx'
import { useToast } from '../lib/toast.jsx'

function VariantChip({ v, active, onClick }) {
  const label = optionsLabel(v) || `Вариант #${v.id}`
  const dot = (v.color_hex || '').trim()
  return (
    <button
      type="button"
      className={`variant ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="variant__dot" style={dot ? { background: dot } : undefined} />
      <span className="variant__label">{label}</span>
      <span className="variant__price">{money(v.price_cents)}</span>
      {v.stock <= 0 && <span className="variant__oos">нет</span>}
    </button>
  )
}

export default function Product() {
  const { slug } = useParams()
  const { add } = useCart()
  const { push } = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [variantId, setVariantId] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const pr = await api.productBySlug(slug)
        if (!alive) return
        setProduct(pr)
        const first = pr?.variants?.[0]
        setVariantId(first ? first.id : null)
        setImgIdx(0)
        setQty(1)
      } catch (e) {
        if (alive) setErr(e.message || 'Не удалось загрузить товар')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [slug])

  const variant = useMemo(() => {
    if (!product?.variants?.length) return null
    return product.variants.find((v) => v.id === variantId) || product.variants[0]
  }, [product, variantId])

  const images = useMemo(() => {
    const arr = variant?.images || []
    return arr.map((i) => i.url)
  }, [variant])

  const mainImg = images[imgIdx] || images[0] || ''

  async function onAdd() {
    if (!variant) return
    if (variant.stock <= 0) return
    setBusy(true)
    try {
      await add(variant.id, qty)
      push('Добавлено в корзину', { kind: 'ok' })
    } catch (e) {
      push(e.message || 'Ошибка', { kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="crumbs">
          <Link to="/catalog" className="link">← Каталог</Link>
          {product?.categories?.[0]?.name && <span className="muted">/ {product.categories[0].name}</span>}
        </div>

        {err && (
          <div className="alert"><strong>Ошибка:</strong> {err}</div>
        )}

        {loading ? (
          <div className="product">
            <Skeleton className="skeleton--product-media" />
            <div className="product__info">
              <Skeleton className="skeleton--h1" />
              <Skeleton className="skeleton--p" />
              <Skeleton className="skeleton--p" />
              <Skeleton className="skeleton--p short" />
            </div>
          </div>
        ) : product ? (
          <div className="product">
            <div className="product__media">
              <div className="media">
                {mainImg ? (
                  <img src={api.resolveUrl(mainImg)} alt={product.title} className="media__main" />
                ) : (
                  <div className="media__empty">Нет изображения</div>
                )}
                {!!images.length && (
                  <div className="media__thumbs">
                    {images.slice(0, 8).map((u, i) => (
                      <button
                        key={`${u}_${i}`}
                        type="button"
                        className={`thumb ${i === imgIdx ? 'is-active' : ''}`}
                        onClick={() => setImgIdx(i)}
                      >
                        <img src={api.resolveUrl(u)} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="product__info">
              <h1 className="h1">{product.title}</h1>
              <div className="product__price">
                <span className="price">{variant ? money(variant.price_cents) : '—'}</span>
                <span className="muted">•</span>
                <span className={`stock ${variant?.stock > 0 ? 'stock--ok' : 'stock--no'}`}>
                  {variant?.stock > 0 ? `В наличии: ${variant.stock}` : 'Нет в наличии'}
                </span>
              </div>

              <p className="product__desc">{product.description || '—'}</p>

              {!!product?.variants?.length && (
                <div className="block">
                  <div className="block__head">
                    <h3>Варианты</h3>
                    <span className="muted">Выберите комплектацию</span>
                  </div>
                  <div className="variants">
                    {product.variants.map((v) => (
                      <VariantChip
                        key={v.id}
                        v={v}
                        active={v.id === variant?.id}
                        onClick={() => {
                          setVariantId(v.id)
                          setImgIdx(0)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="buy">
                <QtyStepper value={qty} onChange={setQty} min={1} max={99} />
                <button
                  className="btn btn--primary btn--wide"
                  onClick={onAdd}
                  disabled={!variant || variant.stock <= 0 || busy}
                >
                  {busy ? 'Добавляем…' : 'В корзину'}
                </button>
                <Link to="/cart" className="btn btn--ghost btn--wide">Открыть корзину</Link>
              </div>

              <div className="specs">
                <div className="specs__head">
                  <h3>Характеристики</h3>
                  <span className="muted">Поле <span className="mono">specs</span> из бэка</span>
                </div>
                <div className="specs__body">
                  {(product.specs || '').split(/\n+/).filter(Boolean).map((line, idx) => (
                    <div key={idx} className="specs__line">{line}</div>
                  ))}
                  {!product.specs && <div className="muted">—</div>}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { firstImageFromProduct, minPriceFromProduct, money } from '../lib/format.js'

export default function ProductCard({ product }) {
  const img = firstImageFromProduct(product)
  const price = useMemo(() => minPriceFromProduct(product), [product])

  return (
    <Link to={`/product/${product.slug}`} className="card">
      <div className="card__media">
        {img ? (
          <img src={api.resolveUrl(img)} alt={product.title} loading="lazy" />
        ) : (
          <div className="card__placeholder">
            <span>StoreSK</span>
          </div>
        )}
        <div className="card__glow" aria-hidden="true" />
      </div>

      <div className="card__body">
        <div className="card__title" title={product.title}>{product.title}</div>
        <div className="card__meta">
          <span className="pill pill--soft">от {money(price)}</span>
          {product.categories?.slice(0, 2).map((c) => (
            <span key={c.id} className="pill">{c.name}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

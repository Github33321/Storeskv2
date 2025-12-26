import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { money } from '../lib/format.js'
import QtyStepper from '../components/QtyStepper.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useCart } from '../lib/cart.jsx'
import { useToast } from '../lib/toast.jsx'

export default function Cart() {
  const { cart, loading, error, setQty, remove, clear } = useCart()
  const { push } = useToast()
  const [busy, setBusy] = useState('')

  const items = cart?.items || []
  const total = cart?.total_cents || 0

  const empty = !loading && !items.length

  async function onSetQty(id, qty) {
    setBusy(`qty_${id}`)
    try {
      await setQty(id, qty)
    } catch (e) {
      push(e.message || 'Ошибка', { kind: 'err' })
    } finally {
      setBusy('')
    }
  }

  async function onRemove(id) {
    setBusy(`rm_${id}`)
    try {
      await remove(id)
      push('Удалено', { kind: 'ok' })
    } catch (e) {
      push(e.message || 'Ошибка', { kind: 'err' })
    } finally {
      setBusy('')
    }
  }

  async function onClear() {
    setBusy('clear')
    try {
      await clear()
      push('Корзина очищена', { kind: 'ok' })
    } catch (e) {
      push(e.message || 'Ошибка', { kind: 'err' })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="section__head">
          <h1 className="h1">Корзина</h1>
          {items.length > 0 && (
            <button className="btn btn--ghost" onClick={onClear} disabled={busy === 'clear'}>
              {busy === 'clear' ? 'Очищаем…' : 'Очистить'}
            </button>
          )}
        </div>

        {error && <div className="alert"><strong>Ошибка:</strong> {error}</div>}

        {loading ? (
          <div className="cart">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="skeleton--cart" />)}
          </div>
        ) : empty ? (
          <div className="empty">
            <div className="empty__title">Корзина пуста</div>
            <div className="muted">Добавьте товары из каталога — и они появятся здесь.</div>
            <div className="center">
              <Link className="btn btn--primary" to="/catalog">Перейти в каталог</Link>
            </div>
          </div>
        ) : (
          <div className="cart">
            {items.map((it) => (
              <div key={it.id} className="cart-item">
                <Link to={it?.product?.slug ? `/product/${it.product.slug}` : '/catalog'} className="cart-item__media">
                  {it.image ? <img src={api.resolveUrl(it.image)} alt={it.title} /> : <div className="cart-item__ph" />}
                </Link>

                <div className="cart-item__info">
                  <div className="cart-item__title">
                    <Link to={it?.product?.slug ? `/product/${it.product.slug}` : '/catalog'} className="link link--strong">{it.title || 'Товар'}</Link>
                    {it.options && <div className="muted">{it.options}</div>}
                  </div>

                  <div className="cart-item__controls">
                    <QtyStepper
                      value={it.qty}
                      onChange={(v) => onSetQty(it.id, v)}
                      min={1}
                      max={99}
                      size="sm"
                    />
                    <div className="cart-item__prices">
                      <div className="muted">{money(it.price_cents)} × {it.qty}</div>
                      <div className="price">{money(it.line_cents)}</div>
                    </div>
                    <button
                      className="btn btn--ghost"
                      onClick={() => onRemove(it.id)}
                      disabled={busy === `rm_${it.id}` || busy === `qty_${it.id}`}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="cart-total">
              <div>
                <div className="muted">Итого</div>
                <div className="cart-total__sum">{money(total)}</div>
              </div>
              <Link className="btn btn--primary" to="/checkout">Оформить</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

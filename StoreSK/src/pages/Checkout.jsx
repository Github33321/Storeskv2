import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { money } from '../lib/format.js'
import { useCart } from '../lib/cart.jsx'
import { useToast } from '../lib/toast.jsx'

export default function Checkout() {
  const { cart, loading, error, clear } = useCart()
  const { push } = useToast()

  const items = cart?.items || []
  const total = cart?.total_cents || 0

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    telegram: '',
    delivery_method: 'pickup',
    city: '',
    address: '',
    pickup_address: 'Самовывоз (уточнить у менеджера)',
    payment_method: 'card',
    comment: '',
    consent_offer: true,
    consent_privacy: true
  })

  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(null)

  const first = items[0]

  const canSubmit = useMemo(() => {
    if (!items.length) return false
    if (!form.phone.trim() && !form.telegram.trim()) return false
    if (!form.consent_offer || !form.consent_privacy) return false
    return true
  }, [items.length, form])

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit || !first) return

    const payload = {
      // Бэк ожидает хотя бы одно изделие в корне — берём первую позицию из корзины
      product_id: first?.product?.id,
      variant_id: first.variant_id,
      qty: first.qty,

      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      telegram: form.telegram,

      delivery: {
        method: form.delivery_method,
        city: form.city,
        address: form.address,
        pickup_address: form.pickup_address
      },

      payment_method: form.payment_method,
      comment: form.comment,
      consent_offer: form.consent_offer ? 'yes' : '',
      consent_privacy: form.consent_privacy ? 'yes' : '',

      items: items.map((it) => ({
        product_id: it?.product?.id,
        variant_id: it.variant_id,
        title: it.title,
        options: it.options,
        qty: it.qty,
        price_cents: it.price_cents,
        image: it.image,
        slug: it?.product?.slug
      }))
    }

    setBusy(true)
    try {
      const res = await api.checkout(payload)
      setSuccess(res)
      push('Заказ создан', { kind: 'ok' })
      // Обычно корзину очищают после оформления
      await clear()
    } catch (e2) {
      push(e2.message || 'Ошибка оформления', { kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="stack">
        <section className="section">
          <div className="success">
            <div className="success__icon">✓</div>
            <h1 className="h1">Готово! Заказ №{success.order_id}</h1>
            <p className="muted">
              Мы подготовили ссылку для продолжения в Telegram. Там администратор подтвердит детали.
            </p>
            <div className="success__actions">
              <a className="btn btn--primary" href={success.tg_link} target="_blank" rel="noreferrer">Открыть Telegram</a>
              <Link className="btn btn--ghost" to="/catalog">Продолжить покупки</Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="section__head">
          <h1 className="h1">Оформление</h1>
          <Link className="btn btn--ghost" to="/cart">← В корзину</Link>
        </div>

        {error && <div className="alert"><strong>Ошибка:</strong> {error}</div>}

        {loading ? (
          <div className="checkout">
            <div className="panel"><div className="panel__body">Загружаем…</div></div>
          </div>
        ) : !items.length ? (
          <div className="empty">
            <div className="empty__title">Нет товаров</div>
            <div className="muted">Сначала добавьте позиции в корзину.</div>
            <div className="center"><Link className="btn btn--primary" to="/catalog">Перейти в каталог</Link></div>
          </div>
        ) : (
          <div className="checkout">
            <div className="panel">
              <div className="panel__head">
                <h2>Данные покупателя</h2>
                <span className="muted">Телефон или Telegram обязателен</span>
              </div>
              <form className="panel__body form" onSubmit={onSubmit}>
                <div className="form__row">
                  <label>
                    <span>ФИО</span>
                    <input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Иван Иванов" />
                  </label>
                  <label>
                    <span>Телефон*</span>
                    <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+7 900 000-00-00" />
                  </label>
                </div>

                <div className="form__row">
                  <label>
                    <span>Email</span>
                    <input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="mail@example.com" />
                  </label>
                  <label>
                    <span>Telegram</span>
                    <input className="input" value={form.telegram} onChange={(e) => set('telegram', e.target.value)} placeholder="@username" />
                  </label>
                </div>

                <div className="panel__head" style={{ marginTop: 18 }}>
                  <h2>Доставка</h2>
                  <span className="muted">Поля отправятся в <span className="mono">delivery</span></span>
                </div>

                <div className="form__row">
                  <label>
                    <span>Способ</span>
                    <select className="input" value={form.delivery_method} onChange={(e) => set('delivery_method', e.target.value)}>
                      <option value="pickup">Самовывоз</option>
                      <option value="delivery">Доставка</option>
                    </select>
                  </label>
                  <label>
                    <span>Город</span>
                    <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Москва" />
                  </label>
                </div>

                {form.delivery_method === 'delivery' ? (
                  <label>
                    <span>Адрес</span>
                    <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Улица, дом, кв." />
                  </label>
                ) : (
                  <label>
                    <span>Адрес самовывоза</span>
                    <input className="input" value={form.pickup_address} onChange={(e) => set('pickup_address', e.target.value)} />
                  </label>
                )}

                <div className="form__row">
                  <label>
                    <span>Оплата</span>
                    <select className="input" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
                      <option value="card">Карта</option>
                      <option value="cash">Наличные</option>
                      <option value="transfer">Перевод</option>
                    </select>
                  </label>
                  <label>
                    <span>Комментарий</span>
                    <input className="input" value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Например: позвонить за 30 минут" />
                  </label>
                </div>

                <div className="checks">
                  <label className="check">
                    <input type="checkbox" checked={form.consent_offer} onChange={(e) => set('consent_offer', e.target.checked)} />
                    <span>Согласен с офертой*</span>
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={form.consent_privacy} onChange={(e) => set('consent_privacy', e.target.checked)} />
                    <span>Согласен с политикой конфиденциальности*</span>
                  </label>
                </div>

                <button className="btn btn--primary btn--wide" disabled={!canSubmit || busy}>
                  {busy ? 'Отправляем…' : 'Оформить заказ'}
                </button>
              </form>
            </div>

            <div className="panel">
              <div className="panel__head">
                <h2>Ваш заказ</h2>
                <span className="muted">{items.length} поз.</span>
              </div>
              <div className="panel__body">
                <div className="summary">
                  {items.map((it) => (
                    <div key={it.id} className="summary__row">
                      <div className="summary__title">
                        {it.title}
                        {it.options && <div className="muted">{it.options}</div>}
                      </div>
                      <div className="summary__right">
                        <div className="muted">× {it.qty}</div>
                        <div className="price">{money(it.line_cents)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="summary__total">
                  <span className="muted">Итого</span>
                  <span className="price">{money(total)}</span>
                </div>
                <div className="muted" style={{ marginTop: 10 }}>
                  Backend создаёт заказ и отдаёт <span className="mono">tg_link</span> — ссылка появится после оформления.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

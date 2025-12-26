import React, { useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart.jsx'

function IconCart({ className = '' }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6h15l-2 9H8L6 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor"/>
      <path d="M17.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor"/>
    </svg>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { cart } = useCart()
  const [q, setQ] = useState('')

  const count = useMemo(() => cart?.count || cart?.items?.length || 0, [cart])

  function onSubmit(e) {
    e.preventDefault()
    const qs = new URLSearchParams()
    if (q.trim()) qs.set('q', q.trim())
    navigate(`/catalog${qs.toString() ? `?${qs.toString()}` : ''}`)
  }

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand" aria-label="StoreSK">
          <span className="brand__mark">S</span>
          <span className="brand__text">StoreSK</span>
        </Link>

        <nav className="nav__links">
          <NavLink to="/catalog" className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>Каталог</NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>О нас</NavLink>
        </nav>

        <form onSubmit={onSubmit} className="nav__search" role="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input input--search"
            placeholder="Поиск: iPhone, AirPods..."
            aria-label="Поиск"
          />
          <button className="btn btn--ghost" type="submit">Найти</button>
        </form>

        <Link to="/cart" className="cart-btn" aria-label="Корзина">
          <IconCart className="cart-btn__icon" />
          {count > 0 && <span className="cart-btn__badge">{count}</span>}
        </Link>
      </div>
    </header>
  )
}

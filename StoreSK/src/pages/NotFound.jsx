import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="stack">
      <section className="section">
        <div className="empty">
          <div className="empty__title">404 — страница не найдена</div>
          <div className="muted">Похоже, вы перешли по неверному адресу.</div>
          <div className="center">
            <Link className="btn btn--primary" to="/">На главную</Link>
            <Link className="btn btn--ghost" to="/catalog">В каталог</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

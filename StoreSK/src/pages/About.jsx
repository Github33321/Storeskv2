import React from 'react'

export default function About() {
  return (
    <div className="stack">
      <section className="section">
        <div className="section__head">
          <h1 className="h1">О проекте StoreSK</h1>
          <span className="muted">Витрина магазина + корзина + оформление через Telegram</span>
        </div>

        <div className="panel">
          <div className="panel__body prose">
            <p>
              Фронт сделан под ваш бек (Go + Gin). Все запросы идут в <span className="mono">/api</span>,
              cookie корзины хранится на сервере (HttpOnly) и автоматически обновляется.
            </p>

            <h3>Используемые публичные роуты</h3>
            <ul>
              <li><span className="mono">GET /api/categories</span></li>
              <li><span className="mono">GET /api/products?q=&amp;category=&amp;limit=&amp;offset=</span></li>
              <li><span className="mono">GET /api/products/:slug</span></li>
              <li><span className="mono">GET /api/cart</span></li>
              <li><span className="mono">POST /api/cart/items</span></li>
              <li><span className="mono">PATCH /api/cart/items/:id</span></li>
              <li><span className="mono">DELETE /api/cart/items/:id</span></li>
              <li><span className="mono">POST /api/cart/clear</span></li>
              <li><span className="mono">POST /api/checkout</span></li>
            </ul>

            <h3>Как запускать локально</h3>
            <ol>
              <li>Запустите backend по инструкции из его README (обычно <span className="mono">docker-compose up -d --build</span>).</li>
              <li>В этом проекте: <span className="mono">npm install</span> → <span className="mono">npm run dev</span>.</li>
              <li>По умолчанию фронт проксирует <span className="mono">/api</span> и <span className="mono">/media</span> на <span className="mono">http://localhost:8082</span>.</li>
            </ol>

            <p className="muted">
              Если backend на другом адресе — задайте <span className="mono">VITE_PROXY_TARGET</span> (для dev) или
              <span className="mono">VITE_API_BASE</span> (для прод/сборки).
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

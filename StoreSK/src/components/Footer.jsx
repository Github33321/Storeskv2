import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <div className="brand brand--sm">
            <span className="brand__mark">S</span>
            <span className="brand__text">StoreSK</span>
          </div>
          <p className="muted">
            Магазин техники • Гаджеты • Аксессуары. Быстрый поиск, корзина и оформление заказа.
          </p>
        </div>

        <div className="footer__cols">
          <div className="footer__col">
            <h4>Навигация</h4>
            <Link to="/catalog">Каталог</Link>
            <Link to="/cart">Корзина</Link>
            <Link to="/checkout">Оформление</Link>
          </div>
          <div className="footer__col">
            <h4>Контакты</h4>
            <a href="tel:+70000000000">+7 (000) 000-00-00</a>
            <a href="mailto:hello@storesk.local">hello@storesk.local</a>
            <span className="muted">24/7 поддержка</span>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__inner">
          <span className="muted">© {new Date().getFullYear()} StoreSK</span>
          <span className="muted">Доставка и самовывоз • Оплата картой/наличными</span>
        </div>
      </div>
    </footer>
  )
}

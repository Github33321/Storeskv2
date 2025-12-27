import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart.jsx";

/* ---------- icons (inline) ---------- */
function IconCart({ className = "" }) {
    return (
        <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6h15l-2 9H8L6 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
            <path d="M17.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
        </svg>
    );
}

function IconTelegram({ className = "" }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M21.6 4.6 3.9 11.4c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.1c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.5-2.4 5.2 3.8c1 .6 1.7.3 2-.9l3-14.2c.4-1.4-.5-2-1.8-1.5Z"
                fill="currentColor"
                opacity="0.92"
            />
            <path
                d="M9 14.1 18.7 8.2c.5-.3 1-.1.6.3l-7.9 7.2-.3 3.4c0 .2-.1.3-.3.3-.2 0-.3-.1-.4-.3l-1.4-4.7Z"
                fill="rgba(0,0,0,.28)"
            />
        </svg>
    );
}

function IconPhone({ className = "" }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M8.7 3.5 6.8 4.2c-.7.3-1.2 1-1.2 1.8 0 7.9 6.6 14.5 14.5 14.5.8 0 1.5-.5 1.8-1.2l.7-1.9c.2-.7 0-1.4-.6-1.8l-2.8-1.7c-.6-.4-1.4-.3-1.9.2l-1.2 1.2c-.3.3-.8.4-1.2.2-2.1-1-3.8-2.7-4.8-4.8-.2-.4-.1-.9.2-1.2l1.2-1.2c.5-.5.6-1.3.2-1.9L10.5 4c-.4-.6-1.1-.8-1.8-.6Z"
                fill="currentColor"
                opacity="0.92"
            />
        </svg>
    );
}

export default function Navbar() {
    const navigate = useNavigate();
    const { cart } = useCart();
    const [q, setQ] = useState("");

    const count = useMemo(() => cart?.count || cart?.items?.length || 0, [cart]);

    function onSubmit(e) {
        e.preventDefault();
        const qs = new URLSearchParams();
        if (q.trim()) qs.set("q", q.trim());
        navigate(`/catalog${qs.toString() ? `?${qs.toString()}` : ""}`);
    }

    return (
        <header className="nav">
            {/* ✅ ширина/отступы выровнены под steamFrame (через CSS-переменные) */}
            <div className="nav__inner">
                {/* BRAND */}
                <Link to="/" className="brand" aria-label="StoreSK">
                    <img className="brand__logo" src="/logo.png" alt="StoreSK" />
                    <div className="brand__name">
            <span className="brand__title">
              <span className="brand__titleMain">Store</span>
              <span className="brand__titleAccent">SK</span>
            </span>
                    </div>
                </Link>

                {/* SEARCH */}
                <form onSubmit={onSubmit} className="nav__search" role="search">
                    <span className="nav__searchIcon" aria-hidden="true">⌕</span>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="nav__input"
                        placeholder="Поиск по каталогу…"
                        aria-label="Поиск по каталогу"
                    />
                    <button className="nav__searchBtn" type="submit">Найти</button>
                </form>

                {/* CONTACTS */}
                <div className="nav__contacts">
                    <a className="navChip" href="https://t.me/Store_SK" target="_blank" rel="noreferrer" aria-label="Telegram Store_SK">
                        <span className="navChip__icon"><IconTelegram /></span>
                        <span className="navChip__text">Store_SK</span>
                    </a>

                    <a className="navChip" href="tel:+79585698440" aria-label="Позвонить +7(958)5698440">
                        <span className="navChip__icon"><IconPhone /></span>
                        <span className="navChip__text">+7(958)5698440</span>
                    </a>
                </div>

                {/* CART (оставил по смыслу такой же) */}
                <Link to="/cart" className="cart-btn" aria-label="Корзина">
                    <IconCart className="cart-btn__icon" />
                    <span className="cart-btn__label">Корзина</span>
                    {count > 0 && <span className="cart-btn__badge">{count}</span>}
                </Link>
            </div>
        </header>
    );
}

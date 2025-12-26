import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

// ---------- icons (inline, no deps) ----------
function IconChip(props) {
    return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
            <path
                d="M9 3h6v2h2a2 2 0 0 1 2 2v2h2v6h-2v2a2 2 0 0 1-2 2h-2v2H9v-2H7a2 2 0 0 1-2-2v-2H3V9h2V7a2 2 0 0 1 2-2h2V3Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path d="M9 9h6v6H9V9Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}
function IconPhone(props) {
    return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
            <path
                d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path d="M10 5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 19h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
    );
}
function IconHeadset(props) {
    return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
            <path
                d="M4 13v3a3 3 0 0 0 3 3h1v-8H7a3 3 0 0 0-3 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M20 13v3a3 3 0 0 1-3 3h-1v-8h1a3 3 0 0 1 3 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path d="M4 13a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}
function IconLaptop(props) {
    return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
            <path
                d="M5 6h14a2 2 0 0 1 2 2v8H3V8a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path d="M2 18h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}
function IconBolt(props) {
    return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
            <path
                d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ---------- helpers ----------
function pick(obj, keys, fallback = undefined) {
    for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return fallback;
}

function imgUrl(src) {
    if (!src) return "";
    let s = src;

    if (typeof src === "object" && src?.url) s = src.url;
    s = String(s);

    // ✅ фикс для "media/..." (иначе resolveUrl делает /api/media/...)
    if (s.startsWith("media/")) s = "/" + s;
    if (s.startsWith("uploads/")) s = "/" + s;

    try {
        return api.resolveUrl(s);
    } catch {
        return s;
    }
}

function toNumber(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function formatPriceRub(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function normalizeCategories(raw) {
    const arr = Array.isArray(raw) ? raw : raw?.items || raw?.data || raw?.categories || [];
    const list = Array.isArray(arr) ? arr : [];

    return list.map((c) => {
        const id = pick(c, ["id", "_id", "slug", "code"], String(Math.random()));
        const title = pick(c, ["title", "name", "label"], "Категория");
        const image = pick(c, ["image", "img", "cover", "photo", "banner", "image_url", "imageUrl", "url"], "");
        const slug = pick(c, ["slug", "code"], "");
        return { id: String(id), title, image, slug };
    });
}

function normalizeProducts(raw) {
    const arr = Array.isArray(raw) ? raw : raw?.items || raw?.data || raw?.products || [];
    const list = Array.isArray(arr) ? arr : [];

    return list.map((p) => {
        const slug = pick(p, ["slug"], "");
        const id = String(pick(p, ["id", "_id", "slug"], "")) || slug || String(Math.random());
        const title = pick(p, ["title", "name", "model"], "Товар");

        const variants = Array.isArray(p?.variants) ? p.variants : [];
        const v0 = variants[0] || null;

        const image =
            pick(v0, ["image", "img", "cover", "photo", "thumbnail", "image_url", "imageUrl"], "") ||
            (Array.isArray(v0?.images) ? v0.images[0] : "") ||
            pick(v0?.images?.[0] || {}, ["url", "src", "path"], "") ||
            pick(p, ["image", "img", "cover", "photo", "thumbnail", "image_url", "imageUrl"], "") ||
            (Array.isArray(p?.images) ? p.images[0] : "") ||
            (Array.isArray(p?.photos) ? p.photos[0] : "") ||
            pick(p?.media?.[0] || {}, ["url", "src", "path"], "") ||
            "";

        const stockV = toNumber(pick(v0, ["stock", "qty", "count"], null));
        const inStock = Boolean(
            pick(p, ["in_stock", "inStock", "available"], null) ??
            pick(v0, ["in_stock", "inStock", "available"], null) ??
            (stockV !== null ? stockV > 0 : false)
        );

        const variantId = pick(v0, ["id", "_id", "variant_id"], "");

        const priceCents = toNumber(pick(v0, ["price_cents", "priceCents"], null));
        const oldCents = toNumber(pick(v0, ["compare_at_price_cents", "old_price_cents", "compareAtPriceCents"], null));

        const priceRub =
            priceCents !== null ? priceCents / 100 : toNumber(pick(v0, ["price", "cost", "amount"], pick(p, ["price"], null)));
        const oldRub =
            oldCents !== null
                ? oldCents / 100
                : toNumber(pick(v0, ["compare_at_price", "old_price", "oldPrice"], pick(p, ["old_price", "oldPrice"], null)));

        return { id, slug, title, image, inStock, variantId, price: priceRub, oldPrice: oldRub };
    });
}

export default function Home() {
    const [cats, setCats] = useState([]);
    const [newItems, setNewItems] = useState([]);

    const [catsLoading, setCatsLoading] = useState(true);
    const [newLoading, setNewLoading] = useState(true);

    const [catsErr, setCatsErr] = useState("");
    const [newErr, setNewErr] = useState("");

    // ✅ show more / collapse categories
    const [showAllCats, setShowAllCats] = useState(false);
    const CATS_INITIAL = 6;

    const shownCats = useMemo(() => {
        if (showAllCats) return cats;
        return cats.slice(0, CATS_INITIAL);
    }, [cats, showAllCats]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setCatsLoading(true);
                setCatsErr("");
                const data = await api.categories();
                if (!alive) return;
                setCats(normalizeCategories(data));
            } catch (e) {
                if (!alive) return;
                setCatsErr(e?.message || "Ошибка загрузки категорий");
            } finally {
                if (!alive) return;
                setCatsLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setNewLoading(true);
                setNewErr("");
                const data = await api.products({ limit: 8, offset: 0 });
                if (!alive) return;
                setNewItems(normalizeProducts(data));
            } catch (e) {
                if (!alive) return;
                setNewErr(e?.message || "Ошибка загрузки новинок");
            } finally {
                if (!alive) return;
                setNewLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    async function onAdd(p) {
        if (!p?.variantId) return;
        try {
            await api.cartAdd(p.variantId, 1);
        } catch (e) {
            console.error(e);
        }
    }

    async function onBuy(p) {
        if (!p?.variantId || !p.inStock) return;
        try {
            await api.cartAdd(p.variantId, 1);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="home">
            {/* HERO */}
            <section className="hero-poster hero-poster--v2">
                <div className="hero-poster__overlay" aria-hidden="true" />

                {/* квадратики */}
                <div className="hero-cover__floats" aria-hidden="true">
                    <div className="float float--1"><IconChip /></div>
                    <div className="float float--2"><IconPhone /></div>
                    <div className="float float--3"><IconHeadset /></div>
                    <div className="float float--4"><IconLaptop /></div>
                    <div className="float float--5"><IconBolt /></div>
                </div>

                <div className="hero-poster__content">
                    <h1 className="hero-poster__title">
                        <span className="hero-v2__titleTop">Покупай технику в </span>
                        <span className="hero-v2__titleBrand">
              <span className="gradient-text gradient-text--strong">StoreSK</span>
            </span>
                    </h1>

                    <p className="hero-poster__subtitle">
                        Оригинальная техника и аксессуары — честные цены, быстрый заказ и удобная доставка.
                    </p>

                    <div className="hero-poster__actions">
                        <Link className="btn btn--primary" to="/catalog">Открыть каталог</Link>
                        <Link className="btn btn--ghost" to="/cart">Корзина</Link>
                    </div>
                </div>

                <div className="hero-poster__fade" aria-hidden="true" />
            </section>

            {/* КАТАЛОГ */}
            <section className="home-block">
                <div className="home-block__head">
                    <h2 className="home-block__title">Каталог</h2>
                </div>

                {catsLoading ? (
                    <div className="catalogRow">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton--cat" />
                        ))}
                    </div>
                ) : catsErr ? (
                    <div className="home-note">
                        Не удалось загрузить каталог: <span className="mono">{catsErr}</span>
                    </div>
                ) : (
                    <>
                        <div className="catalogRow">
                            {shownCats.map((c) => {
                                const q = c.slug || c.id;
                                return (
                                    <Link
                                        key={c.id}
                                        className="catalogCard"
                                        to={q ? `/catalog?category=${encodeURIComponent(q)}` : "/catalog"}
                                    >
                                        <div className="catalogCard__media">
                                            {c.image ? (
                                                <img src={imgUrl(c.image)} alt={c.title} loading="lazy" />
                                            ) : (
                                                <div className="catalogCard__ph">{c.title}</div>
                                            )}
                                        </div>

                                        <div className="catalogCard__label">{c.title}</div>

                                    </Link>
                                );
                            })}
                        </div>

                        {/* ✅ кнопка снизу (красивая) */}
                        {cats.length > CATS_INITIAL ? (
                            <div className="catalogMore">
                                <button
                                    type="button"
                                    className="catalogMore__btnFancy"
                                    onClick={() => setShowAllCats((v) => !v)}
                                    aria-expanded={showAllCats}
                                >
                  <span className="catalogMore__btnIcon" aria-hidden="true">
                    {showAllCats ? "↑" : "↓"}
                  </span>
                                    <span className="catalogMore__btnText">
                    {showAllCats ? "Свернуть категории" : "Показать все категории"}
                  </span>
                                    <span className="catalogMore__btnGlow" aria-hidden="true" />
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </section>

            {/* НОВИНКИ */}
            <section className="home-block">
                <div className="home-block__head">
                    <h2 className="home-block__title">Новые поступления</h2>
                    <Link className="home-block__link" to="/catalog">Все новинки</Link>
                </div>

                {newLoading ? (
                    <div className="newGrid">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton--new" />
                        ))}
                    </div>
                ) : newErr ? (
                    <div className="home-note">
                        Не удалось загрузить новинки: <span className="mono">{newErr}</span>
                    </div>
                ) : (
                    <div className="newGrid">
                        {newItems.map((p) => (
                            <article key={p.id} className="newCard">
                                <div className="newCard__media">
                                    {p.image ? (
                                        <img src={imgUrl(p.image)} alt={p.title} loading="lazy" />
                                    ) : (
                                        <div className="newCard__ph">{p.title.slice(0, 1)}</div>
                                    )}
                                </div>

                                <div className="newCard__body">
                                    <div className="newCard__title" title={p.title}>{p.title}</div>

                                    <div className="newCard__stock">
                                        <span className={`dot ${p.inStock ? "dot--ok" : "dot--no"}`} />
                                        {p.inStock ? "В наличии" : "Нет в наличии"}
                                    </div>

                                    <div className="newCard__prices">
                                        <div className="newCard__price">{formatPriceRub(p.price) || "Цена уточняется"}</div>
                                        {p.oldPrice ? <div className="newCard__old">{formatPriceRub(p.oldPrice)}</div> : null}
                                    </div>

                                    <button
                                        className="btn btn--primary btn--wide newCard__btnBuy"
                                        onClick={() => onBuy(p)}
                                        disabled={!p.variantId || !p.inStock}
                                        type="button"
                                    >
                                        Купить
                                    </button>

                                    <button
                                        className="btn btn--ghost btn--wide newCard__btnAdd"
                                        onClick={() => onAdd(p)}
                                        disabled={!p.variantId}
                                        type="button"
                                    >
                                        Добавить в корзину
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

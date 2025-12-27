import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import CategoryPills from "../components/CategoryPills.jsx";
import Skeleton from "../components/Skeleton.jsx";

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

  // фикс для "media/..." (иначе resolveUrl делает /api/media/...)
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

// скидка 8.66% => старая цена = price * 1.0866
function calcOldFromPrice(priceRub) {
  const p = toNumber(priceRub);
  if (p === null || p <= 0) return null;
  const old = Math.round(p * 1.0866);
  return old > p ? old : null;
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

    // если oldPrice не приходит — считаем по формуле (price * 1.0866)
    const oldRubFromApi =
        oldCents !== null
            ? oldCents / 100
            : toNumber(pick(v0, ["compare_at_price", "old_price", "oldPrice"], pick(p, ["old_price", "oldPrice"], null)));

    const oldPrice = oldRubFromApi ?? calcOldFromPrice(priceRub);

    return { id, slug, title, image, inStock, variantId, price: priceRub, oldPrice };
  });
}

export default function Catalog() {
  const navigate = useNavigate();

  const [sp, setSp] = useSearchParams();
  const q = (sp.get("q") || "").trim();
  const category = (sp.get("category") || "").trim();

  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const title = useMemo(() => {
    if (q) return `Поиск: “${q}”`;
    if (!category) return "Каталог";
    const c = cats.find((x) => x.slug === category || String(x.id) === String(category));
    return c ? (c.name || c.title || "Каталог") : "Каталог";
  }, [q, category, cats]);

  useEffect(() => {
    let alive = true;
    api
        .categories()
        .then((c) => alive && setCats(Array.isArray(c) ? c : c?.items || c?.data || []))
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function fetchPage({ offset, append }) {
    setErr("");
    try {
      const page = await api.products({ q, category, limit: 12, offset });
      const normalized = normalizeProducts(page);

      if (append) setItems((prev) => [...prev, ...normalized]);
      else setItems(normalized);

      setDone((Array.isArray(normalized) ? normalized.length : 0) < 12);
    } catch (e) {
      setErr(e?.message || "Ошибка загрузки");
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setDone(false);
      setItems([]);
      await fetchPage({ offset: 0, append: false });
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  async function onLoadMore() {
    setLoadingMore(true);
    await fetchPage({ offset: items.length, append: true });
    setLoadingMore(false);
  }

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
      const slugOrId = encodeURIComponent(p.slug || p.id);
      navigate(`/product/${slugOrId}`);
    } catch (e) {
      console.error(e);
    }
  }

  return (
      <div className="stack">
        <section className="section">
          <div className="section__head">
            <h1 className="h1">{title}</h1>

            <div className="right">
              <label className="muted">Поиск</label>
              <input
                  className="input"
                  value={q}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = new URLSearchParams(sp);
                    if (v.trim()) next.set("q", v);
                    else next.delete("q");
                    setSp(next, { replace: true });
                  }}
                  placeholder="Например: iPhone 15"
              />
            </div>
          </div>

          <CategoryPills
              categories={cats}
              active={category}
              onPick={(slug) => {
                const next = new URLSearchParams(sp);
                if (slug) next.set("category", slug);
                else next.delete("category");
                setSp(next, { replace: true });
              }}
          />
        </section>

        {err && (
            <div className="alert">
              <strong>Ошибка:</strong> {err}
            </div>
        )}

        <section className="section">
          <div className="newGrid newGrid--catalog">
            {loading
                ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="skeleton--new" />)
                : items.map((p) => {
                  const slugOrId = encodeURIComponent(p.slug || p.id);
                  const productHref = `/product/${slugOrId}`;

                  // бейдж скидки: показываем если есть цена
                  const showDiscount = !!toNumber(p.price);
                  const discountPct = 8.66;

                  return (
                      <Link key={p.id} className="newCard newCard--catalog" to={productHref}>
                        <div className="newCard__media">
                          {showDiscount ? <div className="saleBadge">-{discountPct}%</div> : null}

                          {p.image ? (
                              <img src={imgUrl(p.image)} alt={p.title} loading="lazy" />
                          ) : (
                              <div className="newCard__ph">{(p.title || "T").slice(0, 1)}</div>
                          )}
                        </div>

                        <div className="newCard__body">
                          <div className="newCard__title newCard__title--pretty" title={p.title}>
                            {p.title}
                          </div>

                          <div className="newCard__stock">
                            <span className={`dot ${p.inStock ? "dot--ok" : "dot--no"}`} />
                            {p.inStock ? "В наличии" : "Нет в наличии"}
                          </div>

                          <div className="newCard__prices newCard__prices--row">
                            <div className="newCard__price">{formatPriceRub(p.price) || "Цена уточняется"}</div>
                            {p.oldPrice ? <div className="newCard__old">{formatPriceRub(p.oldPrice)}</div> : null}
                          </div>

                          <button
                              className="btn btn--primary btn--wide newCard__btnBuy"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onBuy(p);
                              }}
                              disabled={!p.variantId || !p.inStock}
                              type="button"
                          >
                            Купить
                          </button>

                          <button
                              className="btn btn--ghost btn--wide newCard__btnAdd"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAdd(p);
                              }}
                              disabled={!p.variantId}
                              type="button"
                          >
                            Добавить в корзину
                          </button>
                        </div>
                      </Link>
                  );
                })}
          </div>

          {!loading && !items.length && !err && (
              <div className="empty">
                <div className="empty__title">Ничего не нашли</div>
                <div className="muted">Попробуйте другой запрос или снимите фильтр по категории.</div>
              </div>
          )}

          {!loading && items.length > 0 && !done && (
              <div className="center">
                <button className="btn btn--ghost" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Загружаем…" : "Показать ещё"}
                </button>
              </div>
          )}
        </section>
      </div>
  );
}

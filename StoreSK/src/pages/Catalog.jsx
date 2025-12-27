import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
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

    const oldRubFromApi =
        oldCents !== null
            ? oldCents / 100
            : toNumber(pick(v0, ["compare_at_price", "old_price", "oldPrice"], pick(p, ["old_price", "oldPrice"], null)));

    const oldPrice = oldRubFromApi ?? calcOldFromPrice(priceRub);

    return { id, slug, title, image, inStock, variantId, price: priceRub, oldPrice };
  });
}

// нормальная пагинация с total + многоточиями
function makePageModel(current, totalPages) {
  if (!totalPages || totalPages <= 1) return [1];
  if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const windowSize = 5;
  const half = Math.floor(windowSize / 2);

  let start = Math.max(2, current - half);
  let end = Math.min(totalPages - 1, current + half);

  while (end - start + 1 < windowSize && start > 2) start--;
  while (end - start + 1 < windowSize && end < totalPages - 1) end++;

  const pages = [1];
  if (start > 2) pages.push("dots");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("dots");
  pages.push(totalPages);

  return pages;
}

export default function Catalog() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const q = (sp.get("q") || "").trim();
  const category = (sp.get("category") || "").trim();

  const LIMIT = 20;
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);

  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [total, setTotal] = useState(null);

  const totalPages = useMemo(() => {
    if (!total || !Number.isFinite(Number(total))) return null;
    return Math.max(1, Math.ceil(Number(total) / LIMIT));
  }, [total]);

  const hasPrev = page > 1;
  const hasNext = totalPages ? page < totalPages : items.length === LIMIT;

  const title = useMemo(() => {
    if (!category) return q ? `Поиск: “${q}”` : "Каталог";
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

  function setPage(nextPage) {
    const next = new URLSearchParams(sp);
    const safe = Math.max(1, nextPage);
    const finalPage = totalPages ? Math.min(safe, totalPages) : safe;

    if (finalPage <= 1) next.delete("page");
    else next.set("page", String(finalPage));

    setSp(next, { replace: true });
  }

  function setCategory(slug) {
    const next = new URLSearchParams(sp);
    if (!slug) next.delete("category");
    else next.set("category", slug);
    next.delete("page");
    setSp(next, { replace: true });
  }

  async function fetchPage() {
    setErr("");
    setLoading(true);
    try {
      const offset = (page - 1) * LIMIT;
      const res = await api.products({ q, category, limit: LIMIT, offset });

      setItems(normalizeProducts(res));

      const t =
          res?.total ??
          res?.count ??
          res?.meta?.total ??
          res?.meta?.count ??
          res?.pagination?.total ??
          res?.pagination?.count ??
          null;

      setTotal(t);

      const tp = t ? Math.max(1, Math.ceil(Number(t) / LIMIT)) : null;
      if (tp && page > tp) setPage(tp);
    } catch (e) {
      setErr(e?.message || "Ошибка загрузки");
      setItems([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }

  // при смене q/category — сброс на 1 страницу
  useEffect(() => {
    const current = Number(sp.get("page") || "1") || 1;
    if (current !== 1) {
      const next = new URLSearchParams(sp);
      next.delete("page");
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, page]);

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

  const pageModel = useMemo(() => makePageModel(page, totalPages), [page, totalPages]);

  return (
      <div className="catalogPage">
        <section className="catalogHead">
          <div className="catalogHead__top">
            <h1 className="catalogTitle">{title}</h1>
            {totalPages ? <div className="catalogBadge">{page} / {totalPages}</div> : null}
          </div>

          {/* категории: перенос в несколько строк */}
          <div className="catBar">
            <button
                type="button"
                className={`catChip ${!category ? "isActive" : ""}`}
                onClick={() => setCategory("")}
            >
              Все
            </button>

            {cats.map((c) => {
              const slug = c.slug ?? String(c.id);
              const name = c.name || c.title || slug;
              const active = category === slug || String(category) === String(c.id);

              return (
                  <button
                      key={slug}
                      type="button"
                      className={`catChip ${active ? "isActive" : ""}`}
                      onClick={() => setCategory(slug)}
                      title={name}
                  >
                    {name}
                  </button>
              );
            })}
          </div>
        </section>

        {err && (
            <div className="catalogAlert">
              <strong>Ошибка:</strong> {err}
            </div>
        )}

        <section className="catalogBody">
          <div className="newGrid newGrid--catalog">
            {loading
                ? Array.from({ length: LIMIT }).map((_, i) => <Skeleton key={i} className="skeleton--new" />)
                : items.map((p) => {
                  const slugOrId = encodeURIComponent(p.slug || p.id);
                  const productHref = `/product/${slugOrId}`;

                  const showDiscount = !!toNumber(p.price);
                  const discountPct = 8.5;

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
              <div className="catalogEmpty">
                <div className="catalogEmpty__title">Ничего не нашли</div>
                <div className="catalogEmpty__text">Попробуйте снять фильтр или изменить запрос.</div>
              </div>
          )}

          {!loading && items.length > 0 && (totalPages ? totalPages > 1 : true) && (
              <div className="pagination">
                <button className="pgBtn" onClick={() => setPage(page - 1)} disabled={!hasPrev} type="button">
                  ← Назад
                </button>

                <div className="pgNums">
                  {pageModel.map((p, idx) =>
                      p === "dots" ? (
                          <span key={`d-${idx}`} className="pgDots">…</span>
                      ) : (
                          <button
                              key={p}
                              className={`pgNum ${p === page ? "isActive" : ""}`}
                              onClick={() => setPage(p)}
                              type="button"
                          >
                            {p}
                          </button>
                      )
                  )}
                </div>

                <button className="pgBtn" onClick={() => setPage(page + 1)} disabled={!hasNext} type="button">
                  Далее →
                </button>
              </div>
          )}
        </section>
      </div>
  );
}

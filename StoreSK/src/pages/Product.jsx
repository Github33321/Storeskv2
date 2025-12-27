// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductBySlug, fmtRub, absUrl } from "../lib/api";
import { cartStore } from "../lib/cart";

/* ──────────────────────────────────────────────────────────────
   no-op метрика (чтобы проект не падал если нет ../lib/metrics)
────────────────────────────────────────────────────────────── */
function ymGoal() {}

/* ──────────────────────────────────────────────────────────────
   Toast-плашка “Добавлено в корзину”
────────────────────────────────────────────────────────────── */
function Toast({ open, message, onClose }) {
  return (
      <div className={`toast ${open ? "toast--show" : ""}`}>
        <div className="toast__inner">
          <span className="toast__ico">✅</span>
          <span className="toast__text">{message}</span>
          <button className="toast__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <style>{`
.toast{
  position:fixed; z-index:1300;
  right:18px; top:18px;
  transform: translateY(-10px);
  opacity:0; pointer-events:none;
  transition: transform .25s ease, opacity .25s ease;
}
.toast--show{ transform:none; opacity:1; pointer-events:auto; }

.toast__inner{
  display:flex; align-items:center; gap:10px;
  max-width:min(92vw,520px);
  padding:12px 14px; border-radius:14px;
  background:rgba(18,12,30,.92);
  border:1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(8px);
  color:#efe7ff; box-shadow:0 12px 30px rgba(0,0,0,.35);
}
.toast__ico{ font-size:18px; }
.toast__text{ font-weight:800; letter-spacing:.2px; flex:1; }
.toast__close{
  margin-left:6px; width:28px; height:28px; border-radius:8px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06); color:#fff; cursor:pointer;
}
@media (max-width:768px){
  .toast{ left:50%; right:auto; top:auto; bottom:env(safe-area-inset-bottom,12px); transform:translate(-50%,10px); }
  .toast--show{ transform:translate(-50%,0); }
  .toast__inner{ width:calc(100vw - 24px); justify-content:center; }
}
      `}</style>
      </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Модалка подтверждения
────────────────────────────────────────────────────────────── */
function ConfirmModal({
                        open,
                        title = "Подтвердите действие",
                        text = "",
                        onConfirm,
                        onCancel,
                        busy,
                      }) {
  if (!open) return null;
  const stop = (e) => e.stopPropagation();
  return (
      <div className="u-modal-overlay" onClick={onCancel}>
        <div
            className="u-modal-card"
            onClick={stop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
          <div className="u-modal-glow" aria-hidden="true" />
          <div className="u-modal-body">
            <div className="u-modal-ico">🛒</div>
            <h3 id="confirm-title" className="u-modal-title">
              {title}
            </h3>
            {text && <p className="u-modal-text">{text}</p>}
            <div className="u-modal-actions">
              <button className="btn-ghost-local" onClick={onCancel} disabled={busy}>
                Отмена
              </button>
              <button
                  className="btn-primary-local"
                  onClick={onConfirm}
                  disabled={busy}
                  autoFocus
              >
                {busy ? "Оформляем…" : "Да, оформить"}
              </button>
            </div>
          </div>
        </div>

        <style>{`
.u-modal-overlay{
  position:fixed; inset:0; display:grid; place-items:center; z-index:2000;
  background: radial-gradient(120% 120% at 50% 50%, rgba(11,8,18,.75), rgba(11,8,18,.85));
  backdrop-filter: blur(4px);
  animation: uFadeIn .18s ease both;
}
@keyframes uFadeIn{ from{opacity:0} to{opacity:1} }

.u-modal-card{
  position:relative; width:min(560px, 92vw);
  border-radius:20px; overflow:hidden;
  background: linear-gradient(180deg, rgba(27,21,40,.95), rgba(27,21,40,.88));
  border:1px solid rgba(200,180,255,.18);
  box-shadow: 0 40px 90px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.04);
  transform: translateY(6px) scale(.98);
  animation: uCardIn .22s ease forwards;
}
@keyframes uCardIn{ to{ transform: translateY(0) scale(1); } }
.u-modal-glow{
  position:absolute; inset:-40%;
  background:
    radial-gradient(40% 40% at 20% 10%, rgba(139,92,246,.25), transparent 60%),
    radial-gradient(42% 42% at 90% 10%, rgba(23,226,191,.18), transparent 60%);
  filter: blur(32px); opacity:.65; pointer-events:none;
}
.u-modal-body{ position:relative; padding:28px 22px 20px; text-align:center; }
.u-modal-ico{
  margin:6px auto 10px; width:60px; height:60px; font-size:28px; display:grid; place-items:center;
  border-radius:16px; background: radial-gradient(120% 120% at 30% 30%, rgba(184,158,255,.6), rgba(129,101,255,.45));
  box-shadow: 0 10px 26px rgba(129,101,255,.35);
}
.u-modal-title{ color:#fff; font-weight:900; font-size:22px; margin:8px 0 6px; }
.u-modal-text{ color:#d8cffb; opacity:.95; margin:0 6px 16px; }
.u-modal-actions{ display:flex; gap:10px; justify-content:center; padding-top:6px; }

.btn-ghost-local{
  -webkit-tap-highlight-color: transparent;
  color:#eadeff; background: rgba(255,255,255,0.02);
  border:1px solid rgba(180,160,255,.35);
  border-radius:12px; padding:12px 16px; font-weight:800; cursor:pointer;
}
.btn-primary-local{
  -webkit-tap-highlight-color: transparent;
  color:#fff;
  background: linear-gradient(135deg, #9d7bff 0%, #7c5bff 100%);
  border:1px solid rgba(160,130,255,.55);
  border-radius:12px; padding:12px 16px; font-weight:800; cursor:pointer;
  box-shadow: 0 12px 30px rgba(125,95,255,.36);
}
      `}</style>
      </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [sel, setSel] = useState({ color: null, memory: null, connectivity: null });
  const [imgIndex, setImgIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [specsExpanded, setSpecsExpanded] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);

  const startX = useRef(0);
  const deltaX = useRef(0);
  const SWIPE = 40;

  useEffect(() => {
    let alive = true;
    setImgIndex(0);
    setP(null);
    setLoading(true);

    getProductBySlug(slug)
        .then((data) => {
          if (!alive) return;
          setP(data);
          const v = data?.variants?.[0];
          setSel({
            color: v?.color || null,
            memory: v?.memory || null,
            connectivity: v?.connectivity || null,
          });
          if (data?.slug) {
            ymGoal("view_org_content", {
              type: "product_view",
              slug: data.slug,
              title: data.title,
            });
          }
        })
        .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape" && confirmOpen) setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgIndex, confirmOpen]);

  const colorOptions = useMemo(() => {
    if (!p?.variants) return [];
    const map = new Map();
    p.variants.forEach((v) => {
      if (!map.has(v.color)) map.set(v.color, { label: v.color, hex: v.color_hex });
    });
    return Array.from(map.values());
  }, [p]);

  const memoryOptions = useMemo(() => {
    if (!p?.variants) return [];
    const set = new Set();
    p.variants.forEach((v) => v.memory && set.add(v.memory));
    const toGb = (s) => {
      if (!s) return Number.POSITIVE_INFINITY;
      const up = String(s).trim().toUpperCase();
      if (up.endsWith("TB")) return parseFloat(up) * 1024;
      if (up.endsWith("GB")) return parseFloat(up);
      const n = parseFloat(up);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };
    return Array.from(set)
        .map((m) => ({ label: m }))
        .sort((a, b) => toGb(a.label) - toGb(b.label));
  }, [p]);

  const connOptions = useMemo(() => {
    if (!p?.variants) return [];
    const set = new Set();
    p.variants.forEach((v) => v.connectivity && set.add(v.connectivity));
    return Array.from(set).map((x) => ({ label: x }));
  }, [p]);

  const exactVariant = useMemo(() => {
    const vs = p?.variants || [];
    return vs.find(
        (v) =>
            (!sel.color || v.color === sel.color) &&
            (!sel.memory || v.memory === sel.memory) &&
            (!sel.connectivity || v.connectivity === sel.connectivity)
    );
  }, [p, sel]);

  const images = useMemo(() => {
    let arr = exactVariant?.images || [];
    if (!arr?.length) {
      const vs = p?.variants || [];
      const fallbackByColor = vs.find((v) => v.color === sel.color);
      arr = fallbackByColor?.images || vs[0]?.images || [];
    }
    arr = arr || [];
    return arr.map((im) => ({ ...im, url: absUrl(im?.url) }));
  }, [exactVariant, p, sel.color]);

  const price = exactVariant?.price_cents ? Math.round(exactVariant.price_cents / 100) : null;
  const inStock = !!exactVariant && (exactVariant?.stock ?? 0) > 0;

  const showToast = (text = "Добавлено в корзину") => {
    setToastMsg(text);
    setToastOpen(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOpen(false), 1800);
  };

  const nextImage = () => {
    if (!images.length) return;
    setImgIndex((i) => (i + 1) % images.length);
  };
  const prevImage = () => {
    if (!images.length) return;
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const handleTouchMove = (e) => {
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const handleTouchEnd = () => {
    if (Math.abs(deltaX.current) > SWIPE && images.length > 1) {
      if (deltaX.current < 0) nextImage();
      else prevImage();
    }
  };

  const onBuy = () => {
    if (!exactVariant || !p) return;
    setConfirmOpen(true);
  };

  const onConfirmBuy = async () => {
    if (!exactVariant || !p) {
      setConfirmOpen(false);
      return;
    }
    try {
      setBuying(true);
      if (inStock && exactVariant?.id) {
        await cartStore.add(exactVariant.id, 1);
        showToast(`«${p.title}» добавлено в корзину`);
      }
      setConfirmOpen(false);
      navigate("/checkout");
    } catch (e) {
      alert(e?.message || "Ошибка оформления");
      setConfirmOpen(false);
    } finally {
      setBuying(false);
    }
  };

  const addToCart = async () => {
    if (!exactVariant?.id) return;
    await cartStore.add(exactVariant.id, 1);
    showToast(`«${p.title}» добавлено в корзину`);
  };

  const specsText = (p?.specs_text || p?.specs || p?.characteristics || "").trim();

  const pageBody = loading ? (
      <div className="container">Загрузка…</div>
  ) : !p ? (
      <div className="container">Товар не найден</div>
  ) : (
      <>
        {/* ===== МОБИЛЬНАЯ ГАЛЕРЕЯ ===== */}
        <section className="m-media">
          <div
              className="m-main"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
          >
            {images.length ? (
                <img
                    src={images[Math.min(imgIndex, images.length - 1)]?.url}
                    alt={images[Math.min(imgIndex, images.length - 1)]?.alt || p.title}
                />
            ) : (
                <div className="noimg">нет фото</div>
            )}
          </div>

          {!!images.length && (
              <div className="m-thumbs">
                {images.map((im, i) => (
                    <button
                        key={im.id || i}
                        className={`mth ${i === imgIndex ? "on" : ""}`}
                        onClick={() => setImgIndex(i)}
                        aria-label={`Фото ${i + 1}`}
                    >
                      <img src={im.url} alt={im.alt || `${p.title} — фото ${i + 1}`} />
                    </button>
                ))}
              </div>
          )}
        </section>

        {/* Заголовок */}
        <div className="product-top">
          <h1 className="ttl-xxl">{p.title}</h1>
        </div>

        <div className="card product-page">
          {/* ===== ДЕСКТОПНАЯ ГАЛЕРЕЯ ===== */}
          <div className="gallery-wrap">
            <div className="thumbs">
              {images?.map((im, i) => (
                  <button
                      key={im.id || i}
                      className={`th ${i === imgIndex ? "on" : ""}`}
                      onClick={() => setImgIndex(i)}
                      aria-label={`Фото ${i + 1}`}
                  >
                    <img loading="lazy" src={im.url} alt={im.alt || p.title} />
                  </button>
              ))}
            </div>

            <div className="gallery-main">
              {images.length > 1 && (
                  <>
                    <button className="side-nav left" aria-label="Предыдущее фото" onClick={prevImage}>
                      ‹
                    </button>
                    <button className="side-nav right" aria-label="Следующее фото" onClick={nextImage}>
                      ›
                    </button>
                  </>
              )}

              {images?.length ? (
                  <img
                      className="gm-desktop"
                      src={images[Math.min(imgIndex, images.length - 1)]?.url}
                      alt={images[Math.min(imgIndex, images.length - 1)]?.alt || p.title}
                  />
              ) : (
                  <div className="noimg gm-desktop">нет фото</div>
              )}
            </div>
          </div>

          {/* ===== Правая колонка ===== */}
          <div className="info">
            <div className="options">
              {!!colorOptions.length && (
                  <div className="opt-group">
                    <div className="opt-title">Цвет</div>
                    <div className="opt-row">
                      {colorOptions.map((c) => {
                        const active = sel.color === c.label;
                        return (
                            <button
                                key={c.label}
                                className={`swatch dot-only ${active ? "on" : ""}`}
                                onClick={() => setSel((s) => ({ ...s, color: c.label }))}
                                title={c.label}
                            >
                              <span className="dot" style={{ background: c.hex || "#999" }} />
                            </button>
                        );
                      })}
                    </div>
                  </div>
              )}

              {!!memoryOptions.length && (
                  <div className="opt-group">
                    <div className="opt-title">Память</div>
                    <div className="opt-row nowrap">
                      {memoryOptions.map((m) => {
                        const active = sel.memory === m.label;
                        return (
                            <button
                                key={m.label}
                                className={`chip ${active ? "on" : ""}`}
                                onClick={() => setSel((s) => ({ ...s, memory: m.label }))}
                            >
                              {m.label}
                            </button>
                        );
                      })}
                    </div>
                  </div>
              )}

              {!!connOptions.length && (
                  <div className="opt-group">
                    <div className="opt-title">Связь</div>
                    <div className="opt-row nowrap">
                      {connOptions.map((x) => {
                        const active = sel.connectivity === x.label;
                        return (
                            <button
                                key={x.label}
                                className={`chip ${active ? "on" : ""}`}
                                onClick={() => setSel((s) => ({ ...s, connectivity: x.label }))}
                            >
                              {x.label}
                            </button>
                        );
                      })}
                    </div>
                  </div>
              )}
            </div>

            {/* Цена/покупка */}
            <div className="buy-panel">
              <div className="buy-head">
                <div className="price-now">{price === null ? "" : fmtRub(price)}</div>
                <div className="stock">
                  <span className={`dot ${inStock ? "" : "red"}`} />{" "}
                  <span className="muted">{inStock ? "В наличии" : "Нет в наличии"}</span>
                </div>
                <div className="price-old">{price === null ? "" : fmtRub(Math.round(price * 1.166))}</div>
              </div>

              <div className="discount-note">
                {price === null ? "Нет в наличии" : `Ваша скидка ${fmtRub(Math.round(price * 0.166))}`}
              </div>

              <button className="btn-buy-animated buy-full" onClick={onBuy} disabled={buying || !inStock}>
                КУПИТЬ
              </button>

              <button className="btn-add-cart" onClick={addToCart} disabled={!inStock}>
                Добавить в корзину
              </button>
            </div>

            {/* Гарантия */}
            <div className="warranty-banner">
              <div className="w-ico">🛡️</div>
              <div className="w-txt">
                <div className="w-title">Прокачанная гарантия</div>
                <div className="w-sub">1 год от магазина</div>
              </div>
            </div>

            {/* Характеристики */}
            {specsText && (
                <section className="specs-wrap">
                  <div className="specs-head">
                    <h3>Характеристики</h3>
                    <button
                        className="specs-toggle"
                        type="button"
                        onClick={() => setSpecsExpanded((v) => !v)}
                        aria-expanded={specsExpanded}
                    >
                      {specsExpanded ? "Свернуть" : "Показать все"}
                    </button>
                  </div>

                  <div className={`specs-body ${specsExpanded ? "open" : ""}`}>
                    <pre className="specs-pre">{specsText}</pre>
                    {!specsExpanded && <div className="specs-fade" aria-hidden="true" />}
                  </div>
                </section>
            )}
          </div>
        </div>

        <ConfirmModal
            open={confirmOpen}
            title="Вы хотите оформить заказ?"
            text="Мы добавим выбранный вариант в корзину и перейдём к оформлению."
            onCancel={() => !buying && setConfirmOpen(false)}
            onConfirm={onConfirmBuy}
            busy={buying}
        />

        <Toast open={toastOpen} message={toastMsg} onClose={() => setToastOpen(false)} />

        {/* Липкая нижняя панель — мобилка */}
        <div className="p-mobile-bar">
          <div className="pmb-price">{price === null ? "" : fmtRub(price)}</div>
          <button className="pmb-cart" onClick={addToCart} disabled={!inStock}>
            В корзину
          </button>
          <button className="pmb-buy" onClick={onBuy} disabled={buying || !inStock}>
            Купить
          </button>
        </div>
      </>
  );

  return (
      <div className="container product-page-wrap">
        {pageBody}

        <style>{`
:root{
  --text:#fff;
  --muted: rgba(235,225,255,.72);
  --vio1:#a88bff;
  --vio2:#8e6bff;
  --vio3:#7c5bff;
  --vioGlow: rgba(142,107,255,.45);
  --ok:#38d46f;
  --bad:#ff4d4f;
}

.product-page-wrap{ position:relative; }
.product-page-wrap:before{
  content:"";
  position: fixed; inset:0; z-index:-1;
  background:
    radial-gradient(1000px 700px at 18% 24%, rgba(168,139,255,.20), transparent 60%),
    radial-gradient(900px 700px at 82% 30%, rgba(142,107,255,.18), transparent 62%),
    radial-gradient(1000px 800px at 60% 90%, rgba(120,86,255,.12), transparent 70%),
    linear-gradient(180deg, rgba(10,8,16,.88), rgba(10,8,16,.94));
}

.card.product-page{
  border-radius: 22px;
  padding: 16px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 26px 70px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.03);
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 16px;
}
@media (max-width: 860px){
  .card.product-page{ grid-template-columns:1fr; padding: 12px; }
}

.product-top{ padding: 10px 0 14px; }
.ttl-xxl{ margin:0; color:#fff; font-weight:1000; font-size: clamp(22px, 3vw, 32px); }

/* gallery */
.gallery-wrap{
  border-radius: 20px;
  padding: 14px;
  background:
    radial-gradient(120% 120% at 10% 0%, rgba(168,139,255,.14), rgba(168,139,255,.04)),
    rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 20px 50px rgba(0,0,0,.32);
  overflow: hidden;
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 14px;
}
.thumbs{
  display:flex; flex-direction:column; gap:12px;
  padding:12px; border-radius:16px;
  background: rgba(0,0,0,.16);
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: inset -18px 0 32px rgba(0,0,0,.24);
}
.th{
  width:100%; aspect-ratio:1/1; padding:6px;
  border-radius:14px; border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.05);
  cursor:pointer; transition:.15s ease;
  box-shadow: 0 12px 28px rgba(0,0,0,.28);
}
.th:hover{ transform: translateY(-2px); background: rgba(255,255,255,.08); }
.th.on{
  border-color: rgba(168,139,255,.90);
  box-shadow: 0 0 0 2px rgba(168,139,255,.22) inset, 0 14px 32px rgba(142,107,255,.22);
  background: rgba(168,139,255,.10);
}
.th img{ width:100%; height:100%; object-fit:contain; border-radius:10px; }

.gallery-main{
  position:relative;
  border-radius:18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.14);
  display:grid; place-items:center;
  min-height: 520px;
  overflow:hidden;
}
.gm-desktop{
  width:100%; height:100%;
  max-height:520px;
  object-fit:contain;
  padding:18px;
  filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
  transition: transform .18s ease;
}
.gallery-main:hover .gm-desktop{ transform: scale(1.02); }

.side-nav{
  position:absolute; top:50%; transform: translateY(-50%);
  width:44px; height:64px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.16);
  background: rgba(18,12,30,.42);
  color:#efe7ff;
  font-size:26px;
  display:grid; place-items:center;
  cursor:pointer;
  box-shadow: 0 14px 34px rgba(0,0,0,.35);
  transition:.15s ease;
  user-select:none;
}
.side-nav:hover{ transform: translateY(-50%) scale(1.05); background: rgba(25,18,40,.55); }
.side-nav.left{ left:14px; }
.side-nav.right{ right:14px; }

/* right card */
.info{
  border-radius:20px;
  padding:16px;
  background:
    radial-gradient(900px 500px at 20% 0%, rgba(168,139,255,.20), transparent 55%),
    radial-gradient(900px 600px at 90% 30%, rgba(142,107,255,.16), transparent 60%),
    rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.09);
  box-shadow: 0 22px 60px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.03);
  backdrop-filter: blur(10px);
}

.opt-group{ margin-bottom:14px; }
.opt-title{ color: var(--muted); font-size:13px; margin-bottom:10px; font-weight:800; }
.opt-row{ display:flex; gap:10px; flex-wrap:wrap; }
.opt-row.nowrap{
  flex-wrap:nowrap;
  overflow-x:auto;
  overflow-y:hidden;
  padding:4px 2px;
  margin:0 -2px;
}
.opt-row.nowrap::-webkit-scrollbar{ display:none; }

.chip{
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.12);
  color:#fff;
  background: rgba(0,0,0,.18);
  cursor:pointer;
  transition:.15s ease;
  font-weight:1000;
}
.chip:hover{ background: rgba(255,255,255,.08); transform: translateY(-1px); }
.chip.on{
  border-color: rgba(168,139,255,.95);
  box-shadow: 0 0 0 2px rgba(168,139,255,.22) inset;
  background: rgba(168,139,255,.12);
}

.swatch.dot-only{
  width:34px; height:34px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  cursor:pointer;
  display:grid; place-items:center;
  transition:.15s ease;
}
.swatch.dot-only .dot{
  width:18px; height:18px;
  border-radius:999px;
  border:2px solid rgba(255,255,255,.25);
}
.swatch.dot-only:hover{ background: rgba(255,255,255,.08); transform: translateY(-1px); }
.swatch.dot-only.on{
  border-color: rgba(168,139,255,.95);
  box-shadow: 0 0 0 2px rgba(168,139,255,.22) inset;
}

/* buy panel */
.buy-panel{
  margin-top:10px;
  padding:16px;
  border-radius:18px;
  background: rgba(0,0,0,.16);
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
}
.buy-head{
  display:grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap:14px;
  row-gap:6px;
  align-items:center;
}
.price-now{
  font-weight:1000;
  color: var(--text);
  white-space:nowrap;
  font-size: clamp(28px, 3.6vw, 40px);
  line-height:1.1;
}
.stock{ white-space:nowrap; justify-self:end; color: rgba(230,220,255,.85); font-weight:800; }
.dot{
  width:8px; height:8px;
  display:inline-block;
  border-radius:999px;
  background: var(--ok);
  margin-right:8px;
  vertical-align:middle;
  box-shadow: 0 0 0 4px rgba(56,212,111,.12);
}
.dot.red{
  background: var(--bad);
  box-shadow: 0 0 0 4px rgba(255,77,79,.12);
}
.price-old{
  grid-column:1/3;
  color: rgba(220,210,255,.55);
  text-decoration: line-through;
  white-space:nowrap;
  font-size:14px;
}

.discount-note{
  margin-top:10px;
  padding:10px 12px;
  border-radius:12px;
  background: rgba(168,139,255,.22);
  border: 1px solid rgba(168,139,255,.20);
  color:#fff;
  font-weight:1000;
}

@keyframes gentleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.btn-buy-animated{
  display:block;
  width:100%;
  padding:14px 0;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  color:#fff;
  font-weight:1000;
  font-size:18px;
  cursor:pointer;
  background: linear-gradient(135deg, var(--vio1) 0%, var(--vio2) 55%, var(--vio3) 100%);
  box-shadow: 0 16px 40px var(--vioGlow);
  transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
  animation: gentleBounce 2.4s ease-in-out infinite;
}
.btn-buy-animated:hover{
  animation:none;
  transform: translateY(-3px);
  box-shadow: 0 20px 52px rgba(142,107,255,.55);
  filter: brightness(1.02);
}
.btn-buy-animated:disabled{ opacity:.6; cursor:not-allowed; box-shadow:none; animation:none; }

.btn-add-cart{
  width:100%;
  margin-top:10px;
  padding:12px 0;
  border-radius:999px;
  background: rgba(255,255,255,.04);
  color:#efe7ff;
  border:1px solid rgba(180,160,255,.35);
  backdrop-filter: blur(6px);
  font-weight:1000;
  font-size:16px;
  cursor:pointer;
  transition:.15s ease;
}
.btn-add-cart:hover{
  transform: translateY(-2px);
  background: rgba(168,139,255,.12);
  border-color: rgba(180,160,255,.55);
  box-shadow: 0 14px 30px rgba(142,107,255,.18);
}
.btn-add-cart:disabled{ opacity:.55; cursor:not-allowed; }

/* warranty */
.warranty-banner{
  display:flex; align-items:center; gap:12px;
  margin-top:16px;
  padding:12px 14px;
  border-radius:16px;
  background: rgba(0,0,0,.14);
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
}
.w-ico{
  width:36px; height:36px;
  border-radius:12px;
  display:grid; place-items:center;
  background: rgba(168,139,255,.22);
  border:1px solid rgba(168,139,255,.25);
  box-shadow: 0 10px 24px rgba(142,107,255,.20);
  font-size:18px;
}
.w-title{ font-weight:1000; color:#fff; font-size:15px; }
.w-sub{ color: rgba(230,220,255,.75); font-size:13px; }

/* specs */
.specs-wrap{
  margin-top:16px;
  padding:14px;
  border-radius:18px;
  background: rgba(0,0,0,.14);
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
}
.specs-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px;
  margin-bottom:10px;
}
.specs-head h3{ margin:0; font-size:18px; font-weight:1000; color:#fff; }
.specs-toggle{
  padding:10px 12px;
  border-radius:12px;
  font-weight:1000;
  color:#fff;
  border:1px solid rgba(180,160,255,.35);
  background: rgba(168,139,255,.14);
  cursor:pointer;
}
.specs-body{
  position:relative;
  overflow:hidden;
  border-radius:14px;
  background: rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.07);
}
.specs-body.open{ overflow:visible; }
.specs-pre{
  margin:0;
  padding:12px 14px;
  font: 600 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  color: rgba(245,240,255,.92);
  white-space: pre-wrap;
  word-wrap: break-word;
  letter-spacing:.2px;
}
.specs-body:not(.open){ max-height:140px; }
.specs-fade{
  position:absolute; left:0; right:0; bottom:0;
  height:56px;
  background: linear-gradient(180deg, rgba(10,8,16,0), rgba(10,8,16,.92));
  pointer-events:none;
}

/* mobile gallery */
.m-media{ display:none; }
@media (max-width: 860px){
  .m-media{ display:block; }
  .gallery-wrap{ display:none !important; }

  .m-main{ width:100%; display:grid; place-items:center; }
  .m-main img{
    width:100%;
    max-height:70vh;
    object-fit:contain;
    border-radius:16px;
    display:block;
    background: rgba(0,0,0,.12);
    border:1px solid rgba(255,255,255,.08);
  }
  .m-thumbs{
    display:flex; gap:10px;
    overflow-x:auto;
    padding:10px 4px 6px;
  }
  .m-thumbs::-webkit-scrollbar{ display:none; }
  .mth{
    flex:0 0 72px;
    aspect-ratio:1/1;
    padding:4px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.12);
    background: rgba(0,0,0,.16);
  }
  .mth.on{
    border-color: rgba(168,139,255,.95);
    box-shadow: 0 0 0 2px rgba(168,139,255,.22) inset;
    background: rgba(168,139,255,.12);
  }
  .mth img{ width:100%; height:100%; object-fit:contain; border-radius:10px; }
}

/* bottom bar mobile */
.p-mobile-bar{ display:none; }
@media (max-width: 860px){
  .p-mobile-bar{
    position:sticky; bottom:0; left:0; right:0; z-index:50;
    display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center;
    padding:12px 14px calc(12px + env(safe-area-inset-bottom));
    background:rgba(16,12,24,.92);
    border-top:1px solid rgba(255,255,255,.12);
    backdrop-filter:blur(10px);
    margin:12px -12px -12px;
    border-radius: 16px 16px 0 0;
  }
  .pmb-price{
    grid-column:1 / -1;
    font-size:18px;
    font-weight:1000;
    color:#fff;
    padding-left:4px;
  }
  .pmb-cart, .pmb-buy{
    height:56px; font-size:16px; font-weight:1000;
    border-radius:14px; border:1px solid transparent;
    cursor:pointer;
  }
  .pmb-cart{
    background:rgba(255,255,255,.08);
    color:#efe7ff;
    border-color:rgba(255,255,255,.22);
  }
  .pmb-buy{
    background:linear-gradient(135deg,var(--vio1),var(--vio2));
    color:#fff;
    border-color:rgba(170,150,255,.45);
    box-shadow:0 12px 28px rgba(142,107,255,.35);
  }

  .buy-panel .buy-full,
  .buy-panel .btn-add-cart{ display:none !important; }

  .product-page-wrap{
    padding-top: calc(96px + env(safe-area-inset-top));
  }
}
      `}</style>
      </div>
  );
}

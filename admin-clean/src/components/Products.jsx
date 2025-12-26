import React, { useEffect, useRef, useState } from 'react'
import {
  listCategories,
  listProducts,
  createProduct,
  deleteProduct,
  createVariant,
  createVariantUpload,
  deleteVariant,
  updateProduct,
  updateVariant,
  uploadImageFile, // <— API вызов для загрузки файла и получения URL
} from '../lib/api'

export default function Products() {
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])

  // форма создания товара
  const [pForm, setPForm] = useState({
    title: '',
    slug: '',
    description: '',
    specs: '',      // ⬅️ характеристики (текст)
    categoryId: ''
  })

  // карта состояний редактирования товара: id => {title, slug, description, specs, category_ids, editing, showDesc, showSpecs}
  const [pEdit, setPEdit] = useState({})

  // общие значения для новой вариации
  const [vForm, setVForm] = useState({
    color: 'Deep Blue',
    color_hex: '#0b2a4a',
    memory: '256GB',
    connectivity: 'SIM + eSIM',
    price_cents: 204990.00, // вводим в рублях (удобнее), потом умножим на 100
    stock: 5,
    image_urls: ''
  })

  // карта режимов редактирования вариаций: variantId => {editing:bool, color, color_hex, memory, connectivity, price_rub, stock, image_urls}
  const [vEdit, setVEdit] = useState({})

  // per-product file input для добавления вариаций
  const filesRefs = useRef({})

  // ====== Редактор фотографий вариации ======
  const [photoEdit, setPhotoEdit] = useState({ open: false, variantId: null, urls: [] })

  const openPhotoEditor = (v) => {
    const urls = (v.images || []).map(im => im.url)
    setPhotoEdit({ open: true, variantId: v.id, urls })
  }

  const closePhotoEditor = () => setPhotoEdit({ open: false, variantId: null, urls: [] })

  const moveUrl = (i, dir) => {
    setPhotoEdit(pe => {
      const arr = [...pe.urls]
      const j = i + dir
      if (j < 0 || j >= arr.length) return pe
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...pe, urls: arr }
    })
  }

  const savePhotoEditor = async () => {
    try {
      await updateVariant(photoEdit.variantId, { image_urls: photoEdit.urls })
      closePhotoEditor()
      load()
    } catch (err) {
      alert('Сохранение не удалось: ' + err.message)
    }
  }

  const load = async () => {
    setCats(await listCategories())
    setItems(await listProducts())
  }
  useEffect(() => { load() }, [])

  // ====== Создание товара ======
  const addProduct = async (e) => {
    e.preventDefault()
    await createProduct({
      title: pForm.title,
      slug: pForm.slug,
      description: pForm.description,
      specs: pForm.specs, // ⬅️
      category_ids: pForm.categoryId ? [Number(pForm.categoryId)] : []
    })
    setPForm({ title: '', slug: '', description: '', specs: '', categoryId: '' })
    load()
  }

  // ====== Редактирование товара ======
  const toggleProductEdit = (p) => {
    setPEdit(prev => {
      const next = { ...prev }
      if (next[p.id]?.editing) {
        next[p.id] = { ...next[p.id], editing: false }
      } else {
        next[p.id] = {
          editing: true,
          showDesc: prev[p.id]?.showDesc ?? false,
          showSpecs: prev[p.id]?.showSpecs ?? false,
          title: p.title || '',
          slug: p.slug || '',
          description: p.description || '',
          specs: p.specs || '', // ⬅️
          category_ids: (p.categories || []).map(c => c.id)
        }
      }
      return next
    })
  }

  const toggleProductDesc = (id) => {
    setPEdit(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        showDesc: !(prev[id]?.showDesc)
      }
    }))
  }
  const toggleProductSpecs = (id) => {
    setPEdit(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        showSpecs: !(prev[id]?.showSpecs)
      }
    }))
  }

  const changeProductField = (id, field, value) => {
    setPEdit(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }))
  }

  const saveProduct = async (id) => {
    const e = pEdit[id]
    if (!e) return
    const payload = {
      title: e.title,
      slug: e.slug,
      description: e.description,
      specs: e.specs, // ⬅️
      category_ids: e.category_ids
    }
    await updateProduct(id, payload)
    setPEdit(prev => ({ ...prev, [id]: { ...prev[id], editing: false } }))
    load()
  }

  // ====== Добавление вариации ======
  const addVariant = async (e, productId) => {
    e.preventDefault()
    const fileInput = filesRefs.current[productId]
    const files = fileInput?.files

    // приводим рубли -> копейки
    let priceRub = parseFloat(String(vForm.price_cents).toString().replace(',', '.'))
    if (isNaN(priceRub)) priceRub = 0
    const priceCents = Math.round(priceRub * 100)

    const fields = {
      color: vForm.color,
      color_hex: vForm.color_hex,
      memory: vForm.memory,
      connectivity: vForm.connectivity,
      price_cents: priceCents,
      stock: Number(vForm.stock || 0)
    }

    const urlList = vForm.image_urls
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean)

    const total = (files?.length || 0) + urlList.length
    if (total < 6) {
      const ok = window.confirm(`Вы добавляете ${total} фото. Рекомендуется минимум 6. Продолжить?`)
      if (!ok) return
    }

    if (files && files.length > 0) {
      await createVariantUpload(productId, fields, files)
      fileInput.value = ''
    } else {
      await createVariant(productId, { ...fields, image_urls: urlList })
    }

    setVForm(f => ({ ...f, image_urls: '' }))
    load()
  }

  // ====== Редактирование вариации ======
  const startEditVariant = (p, v) => {
    setVEdit(prev => ({
      ...prev,
      [v.id]: {
        editing: true,
        color: v.color || '',
        color_hex: v.color_hex || '#000000',
        memory: v.memory || '',
        connectivity: v.connectivity || '',
        price_rub: (v.price_cents ? v.price_cents / 100 : 0).toFixed(2),
        stock: v.stock ?? 0,
        image_urls: (v.images || []).map(im => im.url).join('\n')
      }
    }))
  }

  const cancelEditVariant = (id) => {
    setVEdit(prev => ({ ...prev, [id]: { editing: false } }))
  }

  const changeVariantField = (id, field, value) => {
    setVEdit(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }))
  }

  const saveVariant = async (id) => {
    const e = vEdit[id]
    if (!e) return
    let priceRub = parseFloat(String(e.price_rub).toString().replace(',', '.'))
    if (isNaN(priceRub)) priceRub = 0
    const payload = {
      color: e.color,
      color_hex: e.color_hex,
      memory: e.memory,
      connectivity: e.connectivity,
      price_cents: Math.round(priceRub * 100),
      stock: Number(e.stock || 0),
      image_urls: e.image_urls
          ? e.image_urls.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean)
          : []
    }
    await updateVariant(id, payload)
    setVEdit(prev => ({ ...prev, [id]: { editing: false } }))
    load()
  }

  // ====== Удаления ======
  const delProduct = async (id) => { if (window.confirm('Удалить товар?')) { await deleteProduct(id); load() } }
  const delVar = async (id) => { if (window.confirm('Удалить вариацию?')) { await deleteVariant(id); load() } }

  const Swatch = ({ hex }) => (
      <span style={{
        width: 14, height: 14, borderRadius: 999,
        border: '1px solid var(--border)', display: 'inline-block',
        background: hex || '#999'
      }} />
  )

  return (
      <div>
        <h2>Товары</h2>

        {/* Создание товара */}
        <form onSubmit={addProduct} className="card" style={{ padding: 12, marginBottom: 16 }}>
          <div className="row">
            <input className="input" placeholder="Название" value={pForm.title}
                   onChange={e => setPForm({ ...pForm, title: e.target.value })}/>
            <input className="input" placeholder="slug" value={pForm.slug}
                   onChange={e => setPForm({ ...pForm, slug: e.target.value })}/>
            <select className="input" value={pForm.categoryId}
                    onChange={e => setPForm({ ...pForm, categoryId: e.target.value })}>
              <option value="">Без категории</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea className="input" rows={3} placeholder="Описание"
                    value={pForm.description}
                    onChange={e => setPForm({ ...pForm, description: e.target.value })}/>
          <textarea className="input" rows={4}
                    placeholder="Характеристики (по одной на строке: Ключ: значение)"
                    value={pForm.specs}
                    onChange={e => setPForm({ ...pForm, specs: e.target.value })}/>
          <button className="btn">Создать товар</button>
        </form>

        {/* Таблица товаров */}
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%' }}>
            <thead>
            <tr><th>ID</th><th>Название</th><th>Вариации</th><th>Добавить вариацию</th><th>Действия</th></tr>
            </thead>
            <tbody>
            {items.map(p => {
              const selectedCount = filesRefs.current[p.id]?.files?.length || 0
              const edit = pEdit[p.id] || { editing: false, showDesc: false, showSpecs: false }
              return (
                  <tr key={p.id} style={{ verticalAlign: 'top' }}>
                    <td style={{ padding: 8 }}>{p.id}</td>

                    {/* Колонка: инфо о товаре + редактирование */}
                    <td style={{ padding: 8, minWidth: 360 }}>
                      {!edit.editing ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap:'wrap' }}>
                              <b>{p.title}</b>
                              <button className="secondary" onClick={() => toggleProductEdit(p)}>Редактировать</button>
                            </div>
                            <div className="muted">{p.slug}</div>
                            <div style={{ marginTop: 6 }}>
                              {p.categories?.map(c => <span key={c.id} className="badge">{c.name}</span>)}
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <button className="secondary" onClick={() => toggleProductDesc(p.id)}>
                                {edit.showDesc ? 'Скрыть описание' : 'Показать описание'}
                              </button>
                              {edit.showDesc && (
                                  <div className="muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                    {p.description || <i>— нет описания —</i>}
                                  </div>
                              )}
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <button className="secondary" onClick={() => toggleProductSpecs(p.id)}>
                                {edit.showSpecs ? 'Скрыть характеристики' : 'Показать характеристики'}
                              </button>
                              {edit.showSpecs && (
                                  <div className="muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                                    {p.specs || <i>— нет характеристик —</i>}
                                  </div>
                              )}
                            </div>
                          </>
                      ) : (
                          <>
                            <div className="row" style={{ gap: 8 }}>
                              <input className="input" placeholder="Название"
                                     value={edit.title}
                                     onChange={e => changeProductField(p.id, 'title', e.target.value)} />
                              <input className="input" placeholder="slug"
                                     value={edit.slug}
                                     onChange={e => changeProductField(p.id, 'slug', e.target.value)} />
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <textarea className="input" rows={4} placeholder="Описание"
                                        value={edit.description}
                                        onChange={e => changeProductField(p.id, 'description', e.target.value)} />
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <textarea className="input" rows={4}
                                        placeholder="Характеристики (Ключ: значение, по строкам)"
                                        value={edit.specs}
                                        onChange={e => changeProductField(p.id, 'specs', e.target.value)} />
                            </div>
                            <div className="row" style={{ marginTop: 8 }}>
                              <select className="input" multiple
                                      value={edit.category_ids || []}
                                      onChange={e => {
                                        const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value))
                                        changeProductField(p.id, 'category_ids', opts)
                                      }}>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div className="row" style={{ marginTop: 8, gap: 8 }}>
                              <button className="btn" onClick={() => saveProduct(p.id)}>Сохранить</button>
                              <button className="secondary" onClick={() => toggleProductEdit(p)}>Отмена</button>
                            </div>
                          </>
                      )}
                    </td>

                    {/* Колонка: существующие вариации */}
                    <td style={{ padding: 8, minWidth: 360 }}>
                      {p.variants?.length
                          ? p.variants.map(v => {
                            const ve = vEdit[v.id] || { editing: false }
                            return (
                                <div key={v.id} className="card" style={{ padding: 8, marginBottom: 8 }}>
                                  {!ve.editing ? (
                                      <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                          <Swatch hex={v.color_hex}/>
                                          <span className="badge">{v.color || '—'}</span>
                                          {v.memory && <span className="badge">{v.memory}</span>}
                                          {v.connectivity && <span className="badge">{v.connectivity}</span>}
                                        </div>
                                        <div className="muted" style={{ marginBottom: 6 }}>
                                          Цена: {(v.price_cents/100).toLocaleString('ru-RU',{style:'currency',currency:'RUB'})} · Остаток: {v.stock ?? 0}
                                        </div>
                                        <div className="row" style={{ gap: 8 }}>
                                          <button className="secondary" onClick={() => startEditVariant(p, v)}>Редактировать</button>
                                          <button className="secondary" onClick={() => openPhotoEditor(v)}>Редактировать фото</button>
                                          <button className="secondary" onClick={() => delVar(v.id)}>Удалить</button>
                                        </div>
                                      </>
                                  ) : (
                                      <>
                                        <div className="row" style={{ gap: 8 }}>
                                          <input className="input" placeholder="Цвет"
                                                 value={ve.color}
                                                 onChange={e => changeVariantField(v.id, 'color', e.target.value)} />
                                          <input className="input" type="color" title="HEX"
                                                 value={ve.color_hex}
                                                 onChange={e => changeVariantField(v.id, 'color_hex', e.target.value)}
                                                 style={{width: 60, padding: 2}} />
                                        </div>
                                        <div className="row" style={{ gap: 8, marginTop: 6 }}>
                                          <input className="input" placeholder="Память"
                                                 value={ve.memory}
                                                 onChange={e => changeVariantField(v.id, 'memory', e.target.value)} />
                                          <input className="input" placeholder="Связь"
                                                 value={ve.connectivity}
                                                 onChange={e => changeVariantField(v.id, 'connectivity', e.target.value)} />
                                        </div>
                                        <div className="row" style={{ gap: 8, marginTop: 6 }}>
                                          <input className="input" type="number" step="0.01" placeholder="Цена (₽)"
                                                 value={ve.price_rub}
                                                 onChange={e => changeVariantField(v.id, 'price_rub', e.target.value)} />
                                          <input className="input" type="number" placeholder="Остаток"
                                                 value={ve.stock}
                                                 onChange={e => changeVariantField(v.id, 'stock', e.target.value)} />
                                        </div>
                                        <textarea className="input" rows={3} style={{ marginTop: 6 }}
                                                  placeholder="Ссылки на изображения (по одной на строку или через запятую)"
                                                  value={ve.image_urls}
                                                  onChange={e => changeVariantField(v.id, 'image_urls', e.target.value)} />
                                        <div className="row" style={{ marginTop: 6, gap: 8 }}>
                                          <button className="btn" onClick={() => saveVariant(v.id)}>Сохранить</button>
                                          <button className="secondary" onClick={() => cancelEditVariant(v.id)}>Отмена</button>
                                        </div>
                                      </>
                                  )}
                                </div>
                            )
                          })
                          : <span className="muted">Нет вариаций</span>}
                    </td>

                    {/* Колонка: добавление вариации */}
                    <td style={{ padding: 8, minWidth: 420 }}>
                      <form onSubmit={(e) => addVariant(e, p.id)}>
                        <div className="row">
                          <input className="input" placeholder="Цвет (название)" value={vForm.color}
                                 onChange={e => setVForm({...vForm, color: e.target.value})}/>
                          <input className="input" type="color" title="HEX" value={vForm.color_hex}
                                 onChange={e => setVForm({...vForm, color_hex: e.target.value})}
                                 style={{width: 60, padding: 2}}/>
                          <input className="input" placeholder="Память (256GB/512GB/1TB)" value={vForm.memory}
                                 onChange={e => setVForm({...vForm, memory: e.target.value})}/>
                          <input className="input" placeholder="Связь (SIM + eSIM/eSIM)" value={vForm.connectivity}
                                 onChange={e => setVForm({...vForm, connectivity: e.target.value})}/>
                        </div>
                        <div className="row">
                          <input className="input" type="number" step="0.01" placeholder="Цена (₽)" value={vForm.price_cents}
                                 onChange={e => setVForm({...vForm, price_cents: e.target.value})}/>
                          <input className="input" type="number" placeholder="Остаток" value={vForm.stock}
                                 onChange={e => setVForm({...vForm, stock: e.target.value})}/>
                        </div>

                        <textarea className="input" rows={3}
                                  placeholder="Ссылки на изображения (по одной на строку или через запятую)"
                                  value={vForm.image_urls}
                                  onChange={e => setVForm({...vForm, image_urls: e.target.value})}/>

                        <input
                            className="input"
                            type="file"
                            multiple
                            ref={el => (filesRefs.current[p.id] = el)}
                        />

                        <div className="muted">
                          Вы можете указать ссылки и/или добавить файлы.
                          <br/>
                          Если оставить пусто — <b>фото скопируются от первой вариации того же цвета</b>.
                        </div>

                        <button className="btn">Добавить</button>
                      </form>
                    </td>

                    {/* Колонка: действия с товаром */}
                    <td style={{padding: 8}}>
                      <button className="secondary" onClick={() => delProduct(p.id)}>Удалить товар</button>
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>

        {/* ====== МОДАЛКА РЕДАКТОРА ФОТО ====== */}
        {photoEdit.open && (
            <div className="modal-back" onClick={closePhotoEditor}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Фотографии вариации #{photoEdit.variantId}</h3>

                {/* зона добавления */}
                <div className="row" style={{gap:8, marginBottom:8}}>
                  <input id="addUrlInput" className="input" placeholder="Вставьте ссылку и нажмите +"/>
                  <button className="secondary"
                          onClick={() => {
                            const el = document.getElementById('addUrlInput')
                            const v = (el.value||'').trim()
                            if (!v) return
                            setPhotoEdit(pe => ({...pe, urls:[...pe.urls, v]}))
                            el.value=''
                          }}>+
                  </button>
                  <input id="addFilesInput" type="file" className="input" multiple
                         onChange={async (e) => {
                           const files = Array.from(e.target.files || [])
                           if (!files.length) return
                           const added = []
                           for (const f of files) {
                             try{
                               const { url } = await uploadImageFile(f)
                               added.push(url)
                             }catch(err){ alert('Ошибка загрузки: '+err.message) }
                           }
                           setPhotoEdit(pe => ({...pe, urls:[...pe.urls, ...added]}))
                           e.target.value = ''
                         }} />
                </div>

                {/* превью + управление порядком */}
                {photoEdit.urls.length ? (
                    <div className="grid">
                      {photoEdit.urls.map((u, i) => (
                          <div key={u+'-'+i} className="thumb">
                            <img src={u} alt="" />
                            <div className="thumb-actions">
                              <button title="вверх" onClick={() => moveUrl(i, -1)}>↑</button>
                              <button title="вниз" onClick={() => moveUrl(i, +1)}>↓</button>
                              <button title="удалить" onClick={() => {
                                setPhotoEdit(pe => ({...pe, urls: pe.urls.filter((_,idx)=>idx!==i)}))
                              }}>✕</button>
                            </div>
                          </div>
                      ))}
                    </div>
                ) : <div className="muted">Пока нет фото</div>}

                <div className="row" style={{gap:8, marginTop:12}}>
                  <button className="btn" onClick={savePhotoEditor}>Сохранить</button>
                  <button className="secondary" onClick={closePhotoEditor}>Отмена</button>
                </div>
              </div>
            </div>
        )}

        {/* локальные стили модалки */}
        <style>{modalCss}</style>
      </div>
  )
}

// локальные стили модального редактора
const modalCss = `
.modal-back{
  position: fixed; inset: 0; background: rgba(8,0,20,.55);
  display:grid; place-items:center; z-index: 10000; backdrop-filter: blur(2px);
}
.modal{
  width: min(900px, 96vw); max-height: 86vh; overflow:auto;
  background: linear-gradient(180deg,#1a122a,#140c22);
  border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5); color:#efe7ff;
}
.modal h3{ margin: 0 0 10px; }

.modal .grid{
  display:grid; gap:10px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}
.modal .thumb{
  position:relative; border-radius:12px; overflow:hidden;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
}
.modal .thumb img{
  width:100%; height:120px; object-fit:cover; display:block;
}
.modal .thumb .thumb-actions{
  position:absolute; right:6px; top:6px; display:flex; gap:4px;
}
.modal .thumb .thumb-actions button{
  background: rgba(0,0,0,.35); color:#fff; border:1px solid rgba(255,255,255,.18);
  border-radius:8px; padding:2px 6px; font-size:12px;
}
`

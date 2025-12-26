import React, { useEffect, useRef, useState } from 'react'
import { listCategories, createCategory, deleteCategory, updateCategory, uploadCategoryImage } from '../lib/api'

export default function Categories() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('Смартфоны')
  const [slug, setSlug] = useState('smartphones')
  const fileRefs = useRef({})
  // локальное состояние для редактирования строк
  const [edited, setEdited] = useState({}) // { [id]: { name, slug } }

  const load = async () => {
    try {
      const data = await listCategories()
      setItems(data)
      // сброс редактируемых значений, чтобы они всегда соответствовали актуальным данным
      const nextEdited = {}
      for (const c of data) {
        nextEdited[c.id] = { name: c.name || '', slug: c.slug || '' }
      }
      setEdited(nextEdited)
    } catch (e) {
      console.error('listCategories failed', e)
      alert('Ошибка загрузки категорий: ' + e)
    }
  }

  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    await createCategory({ name, slug })
    setName('')
    setSlug('')
    load()
  }

  const setImageFile = async (id) => {
    const f = fileRefs.current[id]?.files?.[0]
    if (!f) return
    await uploadCategoryImage(id, f)
    fileRefs.current[id].value = ''
    load()
  }

  const setImageByUrl = async (id) => {
    const url = prompt('Вставьте URL изображения')
    if (!url) return
    await updateCategory(id, { image_url: url })
    load()
  }

  const del = async (id) => {
    if (confirm('Удалить категорию?')) {
      await deleteCategory(id)
      load()
    }
  }

  const saveRow = async (id) => {
    const row = edited[id]
    if (!row) return
    await updateCategory(id, {
      name: row.name,
      slug: row.slug,
    })
    await load()
  }

  const onChangeField = (id, field, value) => {
    setEdited(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }))
  }

  return (
      <div>
        <h2>Категории</h2>

        <form onSubmit={add} className="card" style={{ padding: 12, marginBottom: 16 }}>
          <div className="row">
            <input
                className="input"
                placeholder="Название"
                value={name}
                onChange={e => setName(e.target.value)}
            />
            <input
                className="input"
                placeholder="slug"
                value={slug}
                onChange={e => setSlug(e.target.value)}
            />
            <button className="btn">Добавить</button>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            После создания можно загрузить картинку или указать URL
          </div>
        </form>

        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%' }}>
            <thead>
            <tr>
              <th>ID</th>
              <th>Название / slug</th>
              <th>Картинка</th>
              <th>Действия</th>
            </tr>
            </thead>
            <tbody>
            {items.map(c => {
              const row = edited[c.id] || { name: c.name || '', slug: c.slug || '' }
              return (
                  <tr key={c.id}>
                    <td style={{ padding: 8 }}>{c.id}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ marginBottom: 4 }}>
                        <input
                            className="input"
                            value={row.name}
                            onChange={e => onChangeField(c.id, 'name', e.target.value)}
                            placeholder="Название"
                        />
                      </div>
                      <div>
                        <input
                            className="input"
                            value={row.slug}
                            onChange={e => onChangeField(c.id, 'slug', e.target.value)}
                            placeholder="slug"
                        />
                      </div>
                    </td>
                    <td style={{ padding: 8 }}>
                      {c.image_url
                          ? (
                              <img
                                  src={c.image_url}
                                  alt=""
                                  style={{
                                    width: 72,
                                    height: 48,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)'
                                  }}
                              />
                          )
                          : <span className="badge">нет</span>}
                      <div className="row" style={{ marginTop: 6 }}>
                        <input type="file" ref={el => (fileRefs.current[c.id] = el)} />
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => setImageFile(c.id)}
                        >
                          Загрузить
                        </button>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => setImageByUrl(c.id)}
                        >
                          Через URL
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                            className="btn"
                            type="button"
                            onClick={() => saveRow(c.id)}
                        >
                          Сохранить
                        </button>
                        <button
                            className="secondary"
                            type="button"
                            onClick={() => del(c.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>
  )
}

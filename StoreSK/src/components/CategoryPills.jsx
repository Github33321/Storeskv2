import React from 'react'

export default function CategoryPills({ categories, active, onPick }) {
  return (
    <div className="pills">
      <button
        type="button"
        className={`pill pill--click ${!active ? 'is-active' : ''}`}
        onClick={() => onPick('')}
      >
        Все
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`pill pill--click ${active === c.slug || String(active) === String(c.id) ? 'is-active' : ''}`}
          onClick={() => onPick(c.slug)}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

import React from 'react'
import { clamp } from '../lib/format.js'

export default function QtyStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const v = Number(value || 0)
  const dec = () => onChange(clamp(v - 1, min, max))
  const inc = () => onChange(clamp(v + 1, min, max))

  return (
    <div className={`stepper stepper--${size}`}>
      <button type="button" className="stepper__btn" onClick={dec} aria-label="Уменьшить">−</button>
      <input
        className="stepper__value"
        value={v}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isNaN(n)) return
          onChange(clamp(n, min, max))
        }}
      />
      <button type="button" className="stepper__btn" onClick={inc} aria-label="Увеличить">+</button>
    </div>
  )
}

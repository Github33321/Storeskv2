import React, { useState } from 'react'
import { login } from '../lib/api'

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      onSuccess?.()
    } catch (e) {
      setErr('Ошибка входа: ' + (e?.message || e))
    }
  }

  return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 24 }}>
        <h2>Вход в админку</h2>
        <form onSubmit={submit} className="card" style={{ padding: 12 }}>
          <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn">Войти</button>
          {err && <div style={{ color: 'crimson', marginTop: 8 }}>{err}</div>}
        </form>
      </div>
  )
}

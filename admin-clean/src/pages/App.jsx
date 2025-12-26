import React, { useState } from 'react'
import Login from '../components/Login.jsx'
import Categories from '../components/Categories.jsx'
import Products from '../components/Products.jsx'

export default function App() {
  const [view, setView] = useState('categories')
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'))

  const logout = () => {
    localStorage.removeItem('token')
    setAuthed(false)
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }

  return (
      <div className="container">
        <header className="site-header" style={{ marginBottom: 20 }}>
          <div className="hdr-row">
            <div className="brand"><span className="logo-circle">⎈</span> <b>EscapeShop Admin</b></div>
            <div className="hdr-actions" style={{ gap: 8 }}>
              <button className={`btn ${view === 'categories' ? '' : 'secondary'}`} onClick={() => setView('categories')}>Категории</button>
              <button className={`btn ${view === 'products' ? '' : 'secondary'}`} onClick={() => setView('products')}>Товары</button>
              <button className="secondary" onClick={logout}>Выйти</button>
            </div>
          </div>
        </header>

        {view === 'categories' && <Categories />}
        {view === 'products' && <Products />}
      </div>
  )
}

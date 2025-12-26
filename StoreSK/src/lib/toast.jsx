import React, { createContext, useContext, useMemo, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function push(message, { kind = 'info', ms = 2600 } = {}) {
    const id = Math.random().toString(16).slice(2)
    const t = { id, message, kind }
    setToasts((prev) => [...prev, t])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, ms)
  }

  const value = useMemo(() => ({ push }), [])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) return { push: () => {} }
  return ctx
}

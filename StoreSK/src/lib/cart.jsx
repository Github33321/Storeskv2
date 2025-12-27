// lib/cart.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'

const CartCtx = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.cart()
      setCart(data)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить корзину')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (variantId, qty = 1) => {
    await api.cartAdd(variantId, qty)
    await refresh()
  }, [refresh])

  const setQty = useCallback(async (itemId, qty) => {
    await api.cartSetQty(itemId, qty)
    await refresh()
  }, [refresh])

  const remove = useCallback(async (itemId) => {
    await api.cartDeleteItem(itemId)
    await refresh()
  }, [refresh])

  const clear = useCallback(async () => {
    await api.cartClear()
    await refresh()
  }, [refresh])

  const value = useMemo(
      () => ({ cart, loading, error, refresh, add, setQty, remove, clear }),
      [cart, loading, error, refresh, add, setQty, remove, clear]
  )

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) {
    return {
      cart: null,
      loading: false,
      error: '',
      refresh: async () => {},
      add: async () => {},
      setQty: async () => {},
      remove: async () => {},
      clear: async () => {}
    }
  }
  return ctx
}

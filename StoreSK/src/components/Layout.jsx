import React from 'react'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import { ToastProvider } from '../lib/toast.jsx'

export default function Layout({ children }) {
  return (
    <ToastProvider>
      <div className="app">
        <div className="bg-grid" aria-hidden="true" />
        <div className="bg-orb bg-orb--1" aria-hidden="true" />
        <div className="bg-orb bg-orb--2" aria-hidden="true" />
        <Navbar />
        <main className="container main">{children}</main>
        <Footer />
      </div>
    </ToastProvider>
  )
}

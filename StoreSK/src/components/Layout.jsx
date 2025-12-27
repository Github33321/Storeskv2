import React from 'react'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import { ToastProvider } from '../lib/toast.jsx'

// Floating icons (no deps) — optional but nice for a consistent look across pages
function IconChip(props) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
      <path
        d="M9 3h6v2h2a2 2 0 0 1 2 2v2h2v6h-2v2a2 2 0 0 1-2 2h-2v2H9v-2H7a2 2 0 0 1-2-2v-2H3V9h2V7a2 2 0 0 1 2-2h2V3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9 9h6v6H9V9Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconPhone(props) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
      <path
        d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M10 5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 19h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

function IconHeadset(props) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
      <path
        d="M4 13v3a3 3 0 0 0 3 3h1v-8H7a3 3 0 0 0-3 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M20 13v3a3 3 0 0 1-3 3h-1v-8h1a3 3 0 0 1 3 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M4 13a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconLaptop(props) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v8H3V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 18h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconBolt(props) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" {...props}>
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Layout({ children }) {
  return (
    <ToastProvider>
      <div className="steamPage">
        <div className="steamPage__sides" aria-hidden="true" />

        {/* floating chips across the whole site */}
        <div className="steamPage__floats" aria-hidden="true">
          <div className="float float--a"><IconChip /></div>
          <div className="float float--b"><IconPhone /></div>
          <div className="float float--c"><IconHeadset /></div>

          <div className="float float--d"><IconLaptop /></div>
          <div className="float float--e"><IconBolt /></div>
          <div className="float float--f"><IconChip /></div>

          <div className="float float--g"><IconPhone /></div>
          <div className="float float--h"><IconHeadset /></div>
          <div className="float float--i"><IconLaptop /></div>
          <div className="float float--j"><IconBolt /></div>
        </div>

        <Navbar />

        <div className="steamFrame">
          <div className="siteContent">{children}</div>
        </div>

        <Footer />
      </div>
    </ToastProvider>
  )
}

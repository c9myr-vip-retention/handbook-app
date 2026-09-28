import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

let theme = 'light'
try { theme = localStorage.getItem('hb-theme') === 'dark' ? 'dark' : 'light' } catch {}
document.documentElement.setAttribute('data-theme', theme)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

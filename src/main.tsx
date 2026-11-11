import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PhoneMockup } from './PhoneMockup'
import './index.css'

// Desktop visitors see the app inside an iPhone mockup (the app itself runs in an
// iframe at ?embed=1, so its mobile layout kicks in naturally). Visitors who are
// already on a phone, or inside the mockup's iframe, get the app directly.
const embedded = new URLSearchParams(window.location.search).has('embed') || window.self !== window.top
const onPhone = window.matchMedia('(max-width: 600px), (pointer: coarse) and (max-width: 900px)').matches
if (embedded) document.documentElement.classList.add('embedded')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{embedded || onPhone ? <App /> : <PhoneMockup />}</React.StrictMode>,
)

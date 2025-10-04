import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalytics, trackPageView } from './lib/analytics'
import { ThemeProvider } from './contexts/ThemeProvider'

// Initialize analytics on app load
if (initAnalytics()) {
  trackPageView();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Browser/Windows layouts keep normal padding; macOS reserves native controls.
document.documentElement.dataset.platform = window.electronAPI?.platform || 'browser'

// Inject skip-to-content link before the React root (WCAG 2.4.1)
const skipLink = document.createElement('a')
skipLink.href = '#main-content'
skipLink.className = 'skip-link'
skipLink.textContent = 'Skip to main content'
document.body.insertBefore(skipLink, document.getElementById('root'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// @ts-ignore
document.title += ` - ${__APP_VERSION__}`;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

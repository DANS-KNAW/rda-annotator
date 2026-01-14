import * as React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@/assets/tailwind.css'

ReactDOM.createRoot(document.getElementById('sidebar')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

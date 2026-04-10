import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminDashboard from './Admin.jsx'

// Route /admin to AdminDashboard, everything else to App
const isAdmin = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminDashboard /> : <App />}
  </React.StrictMode>,
)

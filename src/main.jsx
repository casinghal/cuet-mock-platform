import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminDashboard from './Admin.jsx'
import LegalPage from './Legal.jsx'

// Route to correct component based on pathname
const path = window.location.pathname;
const Component = path.startsWith('/admin')   ? AdminDashboard
                : path.startsWith('/privacy') ? LegalPage
                : path.startsWith('/terms')   ? LegalPage
                : path.startsWith('/refund')  ? LegalPage
                : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>,
)

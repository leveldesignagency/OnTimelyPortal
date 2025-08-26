import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ManagementPortal from './pages/ManagementPortal'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Companies from './pages/Companies'
import DesktopApp from './pages/DesktopApp'
import Analytics from './pages/Analytics'
import Support from './pages/Support'
import Admin from './pages/Admin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/management" replace />} />
      <Route path="/management" element={<ManagementPortal />}>
        <Route index element={<Navigate to="/management/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="companies" element={<Companies />} />
        <Route path="desktop-app" element={<DesktopApp />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="support" element={<Support />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default App

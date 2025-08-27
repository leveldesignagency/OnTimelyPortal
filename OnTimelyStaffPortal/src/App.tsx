import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { staffAuth, AuthState } from './lib/staffAuth'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Companies from './pages/Companies'
import DesktopApp from './pages/DesktopApp'
import Analytics from './pages/Analytics'
import Support from './pages/Support'
import Admin from './pages/Admin'
import Sidebar from './components/Sidebar'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const state = await staffAuth.init()
        setAuthState(state)
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Authentication failed'
        })
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authState?.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Layout Component for authenticated pages
const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await staffAuth.getCurrentUser()
      setUser(currentUser)
    }
    getUser()
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <PortalLayout>
              <Dashboard />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <PortalLayout>
              <Dashboard />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute>
            <PortalLayout>
              <Users />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/companies" element={
          <ProtectedRoute>
            <PortalLayout>
              <Companies />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/desktop-app" element={
          <ProtectedRoute>
            <PortalLayout>
              <DesktopApp />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <PortalLayout>
              <Analytics />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <PortalLayout>
              <Admin />
            </PortalLayout>
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App

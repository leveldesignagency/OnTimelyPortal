import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { 
  BarChart3, 
  Users, 
  Building2, 
  Monitor, 
  TrendingUp, 
  LifeBuoy, 
  Settings,
  Menu,
  UserCircle,
  // ChevronLeft, // TODO: Uncomment when needed
  // ChevronRight // TODO: Uncomment when needed
} from 'lucide-react'

const ManagementPortal: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navigationItems = [
    {
      path: '/management/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Overview & metrics'
    },
    {
      path: '/management/users',
      label: 'Users',
      icon: Users,
      description: 'User management'
    },
    {
      path: '/management/companies',
      label: 'Companies',
      icon: Building2,
      description: 'Company management'
    },
    {
      path: '/management/desktop-app',
      label: 'Desktop App',
      icon: Monitor,
      description: 'Desktop app support'
    },
    {
      path: '/management/analytics',
      label: 'Analytics',
      icon: TrendingUp,
      description: 'Usage analytics'
    },
    {
      path: '/management/support',
      label: 'Support',
      icon: LifeBuoy,
      description: 'Help & support'
    },
    {
      path: '/management/admin',
      label: 'Admin',
      icon: Settings,
      description: 'Admin tools'
    }
  ]

  React.useEffect(() => {
    // Redirect to dashboard if no specific route is selected
    if (location.pathname === '/management') {
      navigate('/management/dashboard')
    }
  }, [location.pathname, navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">OnTimely Staff Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <UserCircle className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Staff User</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <nav className="p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors mb-2 ${
                    location.pathname === item.path
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${
                    isSidebarCollapsed ? 'mx-auto' : ''
                  }`} />
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ManagementPortal

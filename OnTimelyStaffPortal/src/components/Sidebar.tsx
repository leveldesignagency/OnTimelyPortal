import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Monitor, 
  BarChart3, 
  HelpCircle, 
  Settings,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react'
import { staffAuth } from '../lib/staffAuth'

interface SidebarProps {
  user: any
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Companies', href: '/companies', icon: Building2 },
    { name: 'Desktop App', href: '/desktop-app', icon: Monitor },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Support', href: '/support', icon: HelpCircle },
    { name: 'Admin', href: '/admin', icon: Settings },
  ]

  const handleLogout = async () => {
    try {
      await staffAuth.logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">OT</span>
          </div>
          <span className="text-xl font-bold text-gray-900">OnTimely</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center w-full p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Staff Member'}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user?.role || 'staff'}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
              isUserMenuOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar

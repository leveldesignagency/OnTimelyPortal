import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Activity, 
  UserPlus, 
  Building,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { db } from '../lib/database'
import { Company, User } from '../lib/supabase'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    onlineUsers: 0,
    newUsersThisMonth: 0,
    newCompaniesThisMonth: 0
  })
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([])
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load all data in parallel
      const [companies, users] = await Promise.all([
        db.companies.getCompanies(),
        db.users.getUsers()
      ])

      // Calculate statistics
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const newUsersThisMonth = users.filter(user => 
        new Date(user.created_at) >= startOfMonth
      ).length
      
      const newCompaniesThisMonth = companies.filter(company => 
        new Date(company.created_at) >= startOfMonth
      ).length

      const onlineUsers = users.filter(user => user.status === 'online').length

      setStats({
        totalCompanies: companies.length,
        totalUsers: users.length,
        onlineUsers,
        newUsersThisMonth,
        newCompaniesThisMonth
      })

      // Get recent companies and users
      setRecentCompanies(companies.slice(0, 5))
      setRecentUsers(users.slice(0, 5))

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompanyGrowthData = () => {
    const now = new Date()
    const months = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        companies: 0,
        users: 0
      })
    }

    // This would be more efficient with a proper analytics query
    // For now, we'll use the data we already have
    return months
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your OnTimely application</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+{stats.newCompaniesThisMonth} this month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <UserPlus className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+{stats.newUsersThisMonth} this month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.onlineUsers}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Active now</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCompanies > 0 ? Math.round((stats.newCompaniesThisMonth / stats.totalCompanies) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 text-orange-500 mr-1" />
            <span className="text-orange-600">Monthly</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Companies */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Companies</h2>
            <p className="text-sm text-gray-600">Latest companies added to the platform</p>
          </div>
          <div className="p-6">
            {recentCompanies.length > 0 ? (
              <div className="space-y-4">
                {recentCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{company.name}</p>
                        <p className="text-xs text-gray-500">
                          {company.subscription_plan || 'basic'} plan • {company.max_users || 5} users max
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(company.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No companies yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <p className="text-sm text-gray-600">Latest users who joined the platform</p>
          </div>
          <div className="p-6">
            {recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role || 'user'} • {user.status || 'offline'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No users yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Add Company</p>
              <p className="text-xs text-gray-500">Create a new company</p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Add User</p>
              <p className="text-xs text-gray-500">Create a new user</p>
            </div>
          </button>
          
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">View Analytics</p>
              <p className="text-xs text-gray-500">Check detailed metrics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

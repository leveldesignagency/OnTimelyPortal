import React, { useState, useEffect } from 'react'
import { Users, Building2, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { db } from '@/lib/database'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    activeUsers: 0,
    activeCompanies: 0
  })
  const [userActivity, setUserActivity] = useState<any[]>([])
  const [companyGrowth, setCompanyGrowth] = useState<any[]>([])
  const [systemMetrics, setSystemMetrics] = useState<any[]>([])
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load all data in parallel
      const [users, companies, tickets, metrics, activity, growth] = await Promise.all([
        db.users.getUsers(),
        db.companies.getCompanies(),
        db.support.getTickets(),
        db.analytics.getSystemMetrics(),
        db.analytics.getUserActivity(30),
        db.analytics.getCompanyGrowth(30)
      ])

      // Calculate stats
      const totalUsers = users.length
      const totalCompanies = companies.length
      const activeUsers = users.filter(u => u.status === 'active').length
      const activeCompanies = companies.filter(c => c.status === 'active').length

      setStats({ totalUsers, totalCompanies, activeUsers, activeCompanies })
      setUserActivity(activity)
      setCompanyGrowth(growth)
      setSystemMetrics(metrics)

      // Get recent tickets
      const recent = tickets.slice(0, 5).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        company: ticket.companies?.name || 'Unknown',
        created_at: ticket.created_at
      }))
      setRecentTickets(recent)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'text-red-600',
      'in-progress': 'text-yellow-600',
      resolved: 'text-green-600',
      closed: 'text-gray-600'
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const getMetricStatusColor = (status: string) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      warning: 'text-yellow-600',
      critical: 'text-red-600'
    }
    return colors[status as keyof typeof colors] || colors.good
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your OnTimely platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600 font-medium">
              +{stats.activeUsers} active
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600 font-medium">
              +{stats.activeCompanies} active
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600 font-medium">
              {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {companyGrowth.length > 0 ? companyGrowth[companyGrowth.length - 1]?.total || 0 : 0}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600 font-medium">
              This month
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity (30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="newUsers" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="activeUsers" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">New Users</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
          </div>
        </div>

        {/* Company Growth Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="basic" stackId="a" fill="#3B82F6" />
              <Bar dataKey="professional" stackId="a" fill="#8B5CF6" />
              <Bar dataKey="enterprise" stackId="a" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Basic</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Professional</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Enterprise</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            {systemMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    metric.status === 'excellent' ? 'bg-green-500' :
                    metric.status === 'good' ? 'bg-blue-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metric.metric_name}</p>
                    <p className="text-xs text-gray-500">Target: {metric.target}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getMetricStatusColor(metric.status)}`}>
                    {metric.metric_value}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{metric.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Support Tickets */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Support Tickets</h3>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-500">{ticket.company}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All Tickets →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Add New User</p>
              <p className="text-xs text-gray-500">Create user account</p>
            </div>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Add Company</p>
              <p className="text-xs text-gray-500">Onboard new company</p>
            </div>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">View Reports</p>
              <p className="text-xs text-gray-500">Generate analytics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

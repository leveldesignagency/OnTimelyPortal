import React from 'react'
import { 
  Users, 
  Building2, 
  Monitor, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const Dashboard: React.FC = () => {
  // Mock data - replace with real data from your backend
  const stats = [
    {
      title: 'Total Users',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Companies',
      value: '156',
      change: '+5%',
      changeType: 'positive',
      icon: Building2,
      color: 'bg-green-500'
    },
    {
      title: 'Desktop App Installs',
      value: '1,892',
      change: '+8%',
      changeType: 'positive',
      icon: Monitor,
      color: 'bg-purple-500'
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: '+0.5%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-emerald-500'
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'user_signup',
      message: 'New user registered: john.doe@company.com',
      time: '2 minutes ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'company_created',
      message: 'New company created: TechCorp Solutions',
      time: '15 minutes ago',
      status: 'success'
    },
    {
      id: 3,
      type: 'app_update',
      message: 'Desktop app v2.1.0 released',
      time: '1 hour ago',
      status: 'info'
    },
    {
      id: 4,
      type: 'error_report',
      message: 'Error reported in chat module',
      time: '2 hours ago',
      status: 'warning'
    }
  ]

  const chartData = [
    { name: 'Jan', users: 400, companies: 24 },
    { name: 'Feb', users: 300, companies: 13 },
    { name: 'Mar', users: 200, companies: 98 },
    { name: 'Apr', users: 278, companies: 39 },
    { name: 'May', users: 189, companies: 48 },
    { name: 'Jun', users: 239, companies: 38 },
    { name: 'Jul', users: 349, companies: 43 }
  ]

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create a new user account',
      icon: Users,
      action: () => console.log('Add user'),
      color: 'bg-blue-500'
    },
    {
      title: 'Create Company',
      description: 'Set up a new company',
      icon: Building2,
      action: () => console.log('Create company'),
      color: 'bg-green-500'
    },
    {
      title: 'System Check',
      description: 'Run system diagnostics',
      icon: Activity,
      action: () => console.log('System check'),
      color: 'bg-purple-500'
    },
    {
      title: 'Download Report',
      description: 'Export system report',
      icon: Download,
      action: () => console.log('Download report'),
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the OnTimely Staff Portal. Here's an overview of your system.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-600 ml-2">from last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Company Growth Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="companies" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                >
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{action.title}</p>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`p-1 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100' :
                  activity.status === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {activity.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {activity.status === 'info' && <Clock className="h-4 w-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

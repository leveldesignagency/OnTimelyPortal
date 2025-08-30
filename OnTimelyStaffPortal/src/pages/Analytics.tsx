import React, { useState } from 'react'
import { 
  // TrendingUp, // TODO: Uncomment when needed
  Users, 
  Activity, 
  Calendar,
  // Download, // TODO: Uncomment when needed
  // Eye, // TODO: Uncomment when needed
  // Clock, // TODO: Uncomment when needed
  // Globe, // TODO: Uncomment when needed
  // Smartphone, // TODO: Uncomment when needed
  // Monitor, // TODO: Uncomment when needed
  BarChart3,
  // PieChart, // TODO: Uncomment when needed
  // Filter // TODO: Uncomment when needed
} from 'lucide-react'
import { 
  // LineChart, // TODO: Uncomment when needed
  // Line, // TODO: Uncomment when needed
  // XAxis, // TODO: Uncomment when needed
  // YAxis, // TODO: Uncomment when needed
  // CartesianGrid, // TODO: Uncomment when needed
  // Tooltip, // TODO: Uncomment when needed
  // ResponsiveContainer, // TODO: Uncomment when needed
  BarChart, 
  Bar,
  // PieChart as RechartsPieChart, // TODO: Uncomment when needed
  // Pie, // TODO: Uncomment when needed
  // Cell // TODO: Uncomment when needed
} from 'recharts'

const Analytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('users')

  // Mock data - replace with real data from your backend
  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const metricOptions = [
    { value: 'users', label: 'User Activity' },
    { value: 'events', label: 'Event Creation' },
    { value: 'engagement', label: 'User Engagement' },
    { value: 'performance', label: 'Performance Metrics' }
  ]

  const overviewStats = [
    {
      title: 'Total Users',
      value: '12,847',
      change: '+15%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Sessions',
      value: '8,234',
      change: '+8%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-green-500'
    },
    {
      title: 'Events Created',
      value: '2,156',
      change: '+23%',
      changeType: 'positive',
      icon: Calendar,
      color: 'bg-purple-500'
    },
    // {
    //   title: 'Avg. Session Time',
    //   value: '24m',
    //   change: '+5%',
    //   changeType: 'positive',
    //   icon: Clock, // TODO: Uncomment when Clock import is restored
    //   color: 'bg-orange-500'
    // }
  ]

  const userActivityData = [
    { date: 'Jan 1', users: 1200, sessions: 1800, events: 45 },
    { date: 'Jan 2', users: 1350, sessions: 2100, events: 52 },
    { date: 'Jan 3', users: 1100, sessions: 1650, events: 38 },
    { date: 'Jan 4', users: 1500, sessions: 2400, events: 67 },
    { date: 'Jan 5', users: 1400, sessions: 2200, events: 58 },
    { date: 'Jan 6', users: 1600, sessions: 2600, events: 72 },
    { date: 'Jan 7', users: 1450, sessions: 2300, events: 61 }
  ]

  const deviceUsageData = [
    { name: 'Desktop', value: 65, color: '#3b82f6' },
    { name: 'Mobile', value: 25, color: '#10b981' },
    { name: 'Tablet', value: 10, color: '#f59e0b' }
  ]

  const topFeatures = [
    { feature: 'Event Creation', usage: 85, change: '+12%' },
    { feature: 'Guest Management', usage: 72, change: '+8%' },
    { feature: 'Chat System', usage: 68, change: '+15%' },
    { feature: 'Calendar View', usage: 61, change: '+5%' },
    { feature: 'File Sharing', usage: 54, change: '+18%' }
  ]

  const performanceMetrics = [
    { metric: 'Page Load Time', value: '1.2s', status: 'good', target: '<2s' },
    { metric: 'API Response Time', value: '180ms', status: 'good', target: '<200ms' },
    { metric: 'Database Query Time', value: '45ms', status: 'excellent', target: '<50ms' },
    { metric: 'Memory Usage', value: '68%', status: 'warning', target: '<70%' },
    { metric: 'CPU Usage', value: '45%', status: 'good', target: '<60%' }
  ]

  const getStatusColor = (status: string) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      warning: 'text-yellow-600',
      critical: 'text-red-600'
    }
    return colors[status as keyof typeof colors] || colors.good
  }

  const getStatusBgColor = (status: string) => {
    const colors = {
      excellent: 'bg-green-100',
      good: 'bg-blue-100',
      warning: 'bg-yellow-100',
      critical: 'bg-red-100'
    }
    return colors[status as keyof typeof colors] || colors.good
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Monitoring</h1>
          <p className="text-gray-600 mt-2">Track user activity, system performance, and usage patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="input"
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => {
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
                <span className="text-sm text-gray-600 ml-2">from last period</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Charts - COMMENTED OUT DUE TO MISSING IMPORTS */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Over Time</h3>
          <p className="text-gray-500 text-center py-20">Chart temporarily disabled - imports commented out</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Usage Distribution</h3>
          <p className="text-gray-500 text-center py-20">Chart temporarily disabled - imports commented out</p>
        </div>
      </div> */}

      {/* Feature Usage & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Features */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
          <div className="space-y-4">
            {topFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                    <span className="text-sm text-gray-500">{feature.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${feature.usage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-green-600 ml-3">{feature.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                  <p className="text-xs text-gray-500">Target: {metric.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                    {metric.value}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(metric.status)} ${getStatusColor(metric.status)}`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Geographic Distribution */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {/* <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" /> */}
            <h4 className="font-medium text-gray-900">Geographic Distribution</h4>
            <p className="text-sm text-gray-600 mt-1">Top regions: US (45%), EU (32%), Asia (23%)</p>
          </div>

          {/* Platform Usage */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {/* <Monitor className="h-8 w-8 text-green-500 mx-auto mb-2" /> */}
            <h4 className="font-medium text-gray-900">Platform Usage</h4>
            <p className="text-sm text-gray-600 mt-1">Desktop: 65%, Mobile: 25%, Tablet: 10%</p>
          </div>

          {/* User Engagement */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Activity className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">User Engagement</h4>
            <p className="text-sm text-gray-600 mt-1">Avg. daily active users: 8,234</p>
          </div>
        </div>
      </div>

      {/* Export & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export & Reports</h3>
            <p className="text-gray-600 mt-1">Generate detailed reports and export data</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </button>
            <button className="btn-primary">
              {/* <Download className="h-4 w-4" /> */}
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics

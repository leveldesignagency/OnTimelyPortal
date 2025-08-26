import React, { useState } from 'react'
import { 
  Users, 
  Building2, 
  Activity, 
  Settings, 
  Database, 
  Shield,
  Upload,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  HardDrive,
  Cpu,
  Memory,
  Network,
  FileText,
  Key,
  Globe
} from 'lucide-react'

const Admin: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview')

  // Mock data - replace with real data from your backend
  const systemHealth = {
    overall: 'excellent',
    uptime: '99.98%',
    lastIncident: '2024-01-10T14:30:00Z',
    activeUsers: '8,234',
    serverLoad: '45%'
  }

  const systemMetrics = [
    {
      name: 'CPU Usage',
      value: '45%',
      status: 'good',
      icon: Cpu,
      color: 'bg-blue-500'
    },
    {
      name: 'Memory Usage',
      value: '68%',
      status: 'warning',
      icon: Memory,
      color: 'bg-yellow-500'
    },
    {
      name: 'Disk Usage',
      value: '72%',
      status: 'warning',
      icon: HardDrive,
      color: 'bg-orange-500'
    },
    {
      name: 'Network',
      value: '32%',
      status: 'excellent',
      icon: Network,
      color: 'bg-green-500'
    }
  ]

  const recentIncidents = [
    {
      id: 'INC-001',
      type: 'Database Slowdown',
      severity: 'medium',
      status: 'resolved',
      description: 'Database queries taking longer than expected',
      createdAt: '2024-01-15T10:30:00Z',
      resolvedAt: '2024-01-15T11:45:00Z'
    },
    {
      id: 'INC-002',
      type: 'API Rate Limiting',
      severity: 'low',
      status: 'resolved',
      description: 'Temporary rate limiting due to high traffic',
      createdAt: '2024-01-14T16:20:00Z',
      resolvedAt: '2024-01-14T17:10:00Z'
    }
  ]

  const adminActions = [
    {
      title: 'Bulk User Creation',
      description: 'Create multiple user accounts from CSV file',
      icon: Users,
      action: () => console.log('Bulk user creation'),
      color: 'bg-blue-500'
    },
    {
      title: 'Company Management',
      description: 'Manage company accounts and settings',
      icon: Building2,
      action: () => console.log('Company management'),
      color: 'bg-green-500'
    },
    {
      title: 'System Backup',
      description: 'Create system backup and restore points',
      icon: Database,
      action: () => console.log('System backup'),
      color: 'bg-purple-500'
    },
    {
      title: 'Security Audit',
      description: 'Run security audit and vulnerability scan',
      icon: Shield,
      action: () => console.log('Security audit'),
      color: 'bg-red-500'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'System Overview', icon: Activity },
    { id: 'users', label: 'Bulk User Management', icon: Users },
    { id: 'companies', label: 'Company Management', icon: Building2 },
    { id: 'monitoring', label: 'System Monitoring', icon: Server },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'backup', label: 'Backup & Recovery', icon: Database }
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
      critical: 'bg-red-600'
    }
    return colors[status as keyof typeof colors] || colors.good
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-600 text-white'
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
        <p className="text-gray-600 mt-2">System administration, monitoring, and management tools</p>
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Health Overview</h3>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(systemHealth.overall)} ${getStatusColor(systemHealth.overall)}`}>
              {systemHealth.overall}
            </span>
            <button className="btn-outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {systemMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`p-3 rounded-lg ${metric.color} inline-block mb-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-medium text-gray-900">{metric.name}</h4>
                <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(metric.status)} ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Server className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Uptime</h4>
            <p className="text-2xl font-bold text-green-600">{systemHealth.uptime}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Active Users</h4>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.activeUsers}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Activity className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Server Load</h4>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.serverLoad}</p>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminActions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={index}
              onClick={action.action}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className={`p-3 rounded-lg ${action.color} inline-block mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    selectedTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* System Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
                <div className="space-y-4">
                  {recentIncidents.map((incident) => (
                    <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{incident.type}</h4>
                          <p className="text-sm text-gray-600">{incident.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {formatDate(incident.createdAt)}</span>
                        {incident.resolvedAt && (
                          <span>Resolved: {formatDate(incident.resolvedAt)}</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          incident.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk User Management Tab */}
          {selectedTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk User Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Import Users</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload CSV File
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Drag and drop CSV file here, or click to browse</p>
                        </div>
                      </div>
                      <button className="btn-primary w-full">
                        <Upload className="h-4 w-4" />
                        Import Users
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Export Users</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Export Format
                        </label>
                        <select className="input">
                          <option>CSV</option>
                          <option>JSON</option>
                          <option>Excel</option>
                        </select>
                      </div>
                      <button className="btn-outline w-full">
                        <Download className="h-4 w-4" />
                        Export Users
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Management Tab */}
          {selectedTab === 'companies' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Create Company</h4>
                    <div className="space-y-4">
                      <input type="text" placeholder="Company Name" className="input" />
                      <input type="email" placeholder="Admin Email" className="input" />
                      <select className="input">
                        <option>Select Plan</option>
                        <option>Basic</option>
                        <option>Professional</option>
                        <option>Enterprise</option>
                      </select>
                      <button className="btn-primary w-full">Create Company</button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Bulk Operations</h4>
                    <div className="space-y-4">
                      <button className="btn-outline w-full">
                        <Upload className="h-4 w-4" />
                        Import Companies
                      </button>
                      <button className="btn-outline w-full">
                        <Download className="h-4 w-4" />
                        Export Companies
                      </button>
                      <button className="btn-outline w-full">
                        <Settings className="h-4 w-4" />
                        Bulk Settings Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Monitoring Tab */}
          {selectedTab === 'monitoring' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Monitoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Response Time</span>
                        <span className="text-sm font-medium text-gray-900">180ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Throughput</span>
                        <span className="text-sm font-medium text-gray-900">1,250 req/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Error Rate</span>
                        <span className="text-sm font-medium text-green-600">0.02%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">System Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">All systems operational</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-600">Memory usage above 70%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {selectedTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security & Access Control</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Access Logs</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Failed Login Attempts</span>
                        <span className="font-medium text-red-600">12</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Suspicious Activities</span>
                        <span className="font-medium text-yellow-600">3</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Security Scan</span>
                        <span className="font-medium text-gray-900">2 hours ago</span>
                      </div>
                    </div>
                    <button className="btn-outline w-full mt-4">
                      <Shield className="h-4 w-4" />
                      Run Security Scan
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">API Keys</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active API Keys</span>
                        <span className="font-medium text-gray-900">24</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Expired Keys</span>
                        <span className="font-medium text-red-600">2</span>
                      </div>
                    </div>
                    <button className="btn-outline w-full mt-4">
                      <Key className="h-4 w-4" />
                      Manage API Keys
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {selectedTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Recovery</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">System Backup</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Backup</span>
                        <span className="font-medium text-gray-900">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Backup Size</span>
                        <span className="font-medium text-gray-900">2.4 GB</span>
                      </div>
                      <button className="btn-primary w-full">
                        <Database className="h-4 w-4" />
                        Create Backup
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Recovery Points</h4>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium text-gray-900 ml-2">5 recovery points</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Oldest:</span>
                        <span className="font-medium text-gray-900 ml-2">7 days ago</span>
                      </div>
                    </div>
                    <button className="btn-outline w-full mt-4">
                      <RefreshCw className="h-4 w-4" />
                      View Recovery Points
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin

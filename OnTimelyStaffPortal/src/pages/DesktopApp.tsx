import React, { useState } from 'react'
import { 
  Download, 
  Monitor, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  FileText,
  Video,
  BookOpen,
  Settings,
  RefreshCw,
  Package
} from 'lucide-react'

const DesktopApp: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview')

  // Mock data - replace with real data from your backend
  const appStats = {
    currentVersion: '2.1.0',
    totalDownloads: '15,847',
    activeUsers: '8,923',
    lastUpdate: '2024-01-10T15:30:00Z',
    updateStatus: 'available'
  }

  const recentUpdates = [
    {
      version: '2.1.0',
      date: '2024-01-10',
      type: 'feature',
      description: 'Enhanced chat functionality and improved performance',
      status: 'released'
    },
    {
      version: '2.0.5',
      date: '2023-12-15',
      type: 'bugfix',
      description: 'Fixed authentication issues and minor UI improvements',
      status: 'released'
    },
    {
      version: '2.0.0',
      date: '2023-11-20',
      type: 'major',
      description: 'Complete UI redesign and new event management features',
      status: 'released'
    }
  ]

  const installationGuides = [
    {
      platform: 'Windows',
      icon: '🪟',
      steps: [
        'Download the installer from the link below',
        'Run the installer as administrator',
        'Follow the installation wizard',
        'Launch OnTimely from the Start menu'
      ],
      downloadLink: '#',
      systemRequirements: 'Windows 10 or later, 4GB RAM, 500MB disk space'
    },
    {
      platform: 'macOS',
      icon: '🍎',
      steps: [
        'Download the .dmg file from the link below',
        'Open the .dmg file and drag OnTimely to Applications',
        'Open OnTimely from Applications folder',
        'Allow necessary permissions when prompted'
      ],
      downloadLink: '#',
      systemRequirements: 'macOS 11.0 or later, 4GB RAM, 500MB disk space'
    },
    {
      platform: 'Linux',
      icon: '🐧',
      steps: [
        'Download the .AppImage file from the link below',
        'Make the file executable: chmod +x OnTimely.AppImage',
        'Run the AppImage file',
        'Optional: Move to /usr/local/bin for system-wide access'
      ],
      downloadLink: '#',
      systemRequirements: 'Ubuntu 20.04+ or equivalent, 4GB RAM, 500MB disk space'
    }
  ]

  const troubleshootingIssues = [
    {
      issue: 'App won\'t start',
      solution: 'Check if your system meets minimum requirements and try running as administrator',
      severity: 'high',
      category: 'startup'
    },
    {
      issue: 'Authentication errors',
      solution: 'Clear app cache and re-authenticate with your credentials',
      severity: 'medium',
      category: 'auth'
    },
    {
      issue: 'Slow performance',
      solution: 'Close other applications and check available system resources',
      severity: 'low',
      category: 'performance'
    },
    {
      issue: 'Update failed',
      solution: 'Download the latest version manually from our website',
      severity: 'medium',
      category: 'updates'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Monitor },
    { id: 'installation', label: 'Installation', icon: Download },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    { id: 'updates', label: 'Updates', icon: RefreshCw },
    { id: 'documentation', label: 'Documentation', icon: BookOpen }
  ]

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Desktop App Support</h1>
        <p className="text-gray-600 mt-2">Manage desktop app installation, updates, and provide user support</p>
      </div>

      {/* App Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Version</p>
              <p className="text-2xl font-bold text-gray-900">{appStats.currentVersion}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Download className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Downloads</p>
              <p className="text-2xl font-bold text-gray-900">{appStats.totalDownloads}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{appStats.activeUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Update</p>
              <p className="text-lg font-bold text-gray-900">{formatDate(appStats.lastUpdate)}</p>
            </div>
          </div>
        </div>
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
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h3>
                <div className="space-y-4">
                  {recentUpdates.map((update, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">v{update.version}</span>
                          <span className="text-sm text-gray-500">{update.date}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            update.type === 'major' ? 'bg-purple-100 text-purple-800' :
                            update.type === 'feature' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {update.type}
                          </span>
                        </div>
                        <p className="text-gray-600">{update.description}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Installation Tab */}
          {selectedTab === 'installation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {installationGuides.map((guide, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">{guide.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-900">{guide.platform}</h3>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      {guide.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {stepIndex + 1}
                          </span>
                          <p className="text-sm text-gray-600">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <button className="btn-primary w-full">
                        <Download className="h-4 w-4" />
                        Download for {guide.platform}
                      </button>
                      <div className="text-xs text-gray-500">
                        <strong>System Requirements:</strong> {guide.systemRequirements}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Troubleshooting Tab */}
          {selectedTab === 'troubleshooting' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues & Solutions</h3>
                <div className="space-y-4">
                  {troubleshootingIssues.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.issue}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{item.solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Updates Tab */}
          {selectedTab === 'updates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Update Management</h3>
                  <p className="text-gray-600">Manage app updates and release schedules</p>
                </div>
                <button className="btn-primary">
                  <RefreshCw className="h-4 w-4" />
                  Check for Updates
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-2">Update Status</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-600">Your app is up to date (v{appStats.currentVersion})</span>
                </div>
              </div>
            </div>
          )}

          {/* Documentation Tab */}
          {selectedTab === 'documentation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation & Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">User Manual</h4>
                        <p className="text-sm text-gray-600">Complete guide to using OnTimely</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Video className="h-8 w-8 text-green-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">Video Tutorials</h4>
                        <p className="text-sm text-gray-600">Step-by-step video guides</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Settings className="h-8 w-8 text-purple-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">Configuration Guide</h4>
                        <p className="text-sm text-gray-600">Advanced settings and customization</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">Troubleshooting</h4>
                        <p className="text-sm text-gray-600">Common issues and solutions</p>
                      </div>
                    </div>
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

export default DesktopApp

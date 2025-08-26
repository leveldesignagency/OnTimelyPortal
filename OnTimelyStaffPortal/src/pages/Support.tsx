import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  MessageCircle, 
  FileText, 
  Video, 
  BookOpen,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Tag,
  Filter,
  ExternalLink
} from 'lucide-react'

const Support: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // Mock data - replace with real data from your backend
  const supportStats = [
    {
      title: 'Open Tickets',
      value: '23',
      change: '+5',
      changeType: 'increase',
      icon: MessageCircle,
      color: 'bg-red-500'
    },
    {
      title: 'Resolved Today',
      value: '18',
      change: '+3',
      changeType: 'increase',
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Avg Response Time',
      value: '2.4h',
      change: '-0.5h',
      changeType: 'decrease',
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'Knowledge Articles',
      value: '156',
      change: '+12',
      changeType: 'increase',
      icon: BookOpen,
      color: 'bg-purple-500'
    }
  ]

  const supportTickets = [
    {
      id: 'TKT-001',
      title: 'Desktop app installation issue on Windows 11',
      user: 'john.doe@company.com',
      category: 'installation',
      priority: 'high',
      status: 'open',
      assignedTo: 'Support Team',
      createdAt: '2024-01-15T10:30:00Z',
      lastUpdated: '2024-01-15T14:20:00Z'
    },
    {
      id: 'TKT-002',
      title: 'Cannot access company events after role change',
      user: 'jane.smith@startup.io',
      category: 'permissions',
      priority: 'medium',
      status: 'in-progress',
      assignedTo: 'Admin Team',
      createdAt: '2024-01-14T16:45:00Z',
      lastUpdated: '2024-01-15T11:15:00Z'
    },
    {
      id: 'TKT-003',
      title: 'Chat system not working in mobile app',
      user: 'mike.johnson@enterprise.com',
      category: 'mobile',
      priority: 'high',
      status: 'resolved',
      assignedTo: 'Mobile Team',
      createdAt: '2024-01-13T09:20:00Z',
      lastUpdated: '2024-01-14T15:30:00Z'
    }
  ]

  const knowledgeBase = [
    {
      title: 'Getting Started with OnTimely',
      category: 'onboarding',
      views: 1247,
      lastUpdated: '2024-01-10',
      type: 'guide'
    },
    {
      title: 'Troubleshooting Common Login Issues',
      category: 'authentication',
      views: 892,
      lastUpdated: '2024-01-08',
      type: 'troubleshooting'
    },
    {
      title: 'Setting Up Company Events',
      category: 'events',
      views: 654,
      lastUpdated: '2024-01-05',
      type: 'guide'
    },
    {
      title: 'Mobile App Configuration',
      category: 'mobile',
      views: 543,
      lastUpdated: '2024-01-03',
      type: 'guide'
    }
  ]

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'installation', label: 'Installation' },
    { value: 'permissions', label: 'Permissions' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'events', label: 'Events' },
    { value: 'billing', label: 'Billing' }
  ]

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ]

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
  ]

  const filteredTickets = supportTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || ticket.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getPriorityBadge = (priority: string) => {
    const config = priorities.find(p => p.value === priority)
    return config ? (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    ) : null
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', label: 'Open' },
      'in-progress': { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
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

  const getCategoryIcon = (category: string) => {
    const icons = {
      installation: '💻',
      permissions: '🔐',
      mobile: '📱',
      events: '📅',
      billing: '💳'
    }
    return icons[category as keyof typeof icons] || '❓'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support & Help</h1>
          <p className="text-gray-600 mt-2">Manage support tickets and provide user assistance</p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          New Support Ticket
        </button>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {supportStats.map((stat, index) => {
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
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-600 ml-2">from yesterday</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="text-center">
            <div className="p-3 bg-blue-100 rounded-lg inline-block mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Knowledge Base</h3>
            <p className="text-gray-600 mb-4">Browse help articles and tutorials</p>
            <button className="btn-outline w-full">
              Browse Articles
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="text-center">
            <div className="p-3 bg-green-100 rounded-lg inline-block mb-4">
              <Video className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Tutorials</h3>
            <p className="text-gray-600 mb-4">Watch step-by-step guides</p>
            <button className="btn-outline w-full">
              Watch Videos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="text-center">
            <div className="p-3 bg-purple-100 rounded-lg inline-block mb-4">
              <HelpCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-gray-600 mb-4">Get instant help from support team</p>
            <button className="btn-outline w-full">
              Start Chat
            </button>
          </div>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets by title or user email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-500">{ticket.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{ticket.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCategoryIcon(ticket.category)}</span>
                      <span className="text-sm text-gray-900 capitalize">{ticket.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(ticket.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.assignedTo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(ticket.lastUpdated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
          <button className="btn-outline">
            <Plus className="h-4 w-4" />
            Add Article
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knowledgeBase.map((article, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">{article.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="capitalize">{article.category}</span>
                    <span>{article.views} views</span>
                    <span>Updated {article.lastUpdated}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    article.type === 'guide' ? 'bg-blue-100 text-blue-800' :
                    article.type === 'troubleshooting' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {article.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Support

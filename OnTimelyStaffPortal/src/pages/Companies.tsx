import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Building2,
  Users,
  Calendar,
  Activity,
  Globe,
  Phone,
  Mail
} from 'lucide-react'

const Companies: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  // Mock company data - replace with real data from your backend
  const companies = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      domain: 'techcorp.com',
      plan: 'Enterprise',
      users: 45,
      status: 'active',
      joinDate: '2023-06-15',
      lastActive: '2024-01-15T10:30:00Z',
      contact: {
        email: 'admin@techcorp.com',
        phone: '+1 (555) 123-4567',
        address: '123 Tech Street, Silicon Valley, CA'
      }
    },
    {
      id: 2,
      name: 'Startup.io',
      domain: 'startup.io',
      plan: 'Professional',
      users: 12,
      status: 'active',
      joinDate: '2023-09-10',
      lastActive: '2024-01-10T14:20:00Z',
      contact: {
        email: 'hello@startup.io',
        phone: '+1 (555) 987-6543',
        address: '456 Innovation Ave, Austin, TX'
      }
    },
    {
      id: 3,
      name: 'Enterprise Corp',
      domain: 'enterprise.com',
      plan: 'Enterprise',
      users: 128,
      status: 'active',
      joinDate: '2023-07-05',
      lastActive: '2024-01-15T11:45:00Z',
      contact: {
        email: 'info@enterprise.com',
        phone: '+1 (555) 456-7890',
        address: '789 Corporate Blvd, New York, NY'
      }
    }
  ]

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.domain.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlanBadge = (plan: string) => {
    const planConfig = {
      'Enterprise': { color: 'bg-purple-100 text-purple-800', label: 'Enterprise' },
      'Professional': { color: 'bg-blue-100 text-blue-800', label: 'Professional' },
      'Basic': { color: 'bg-green-100 text-green-800', label: 'Basic' }
    }
    const config = planConfig[plan as keyof typeof planConfig] || planConfig.Basic
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
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
      day: 'numeric'
    })
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return formatDate(dateString)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-600 mt-2">Manage company accounts, plans, and settings</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Company
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies by name or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Company Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                  <p className="text-sm text-gray-500">{company.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Company Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{company.users}</div>
                <div className="text-xs text-gray-500">Users</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900">{company.plan}</div>
                <div className="text-xs text-gray-500">Plan</div>
              </div>
            </div>

            {/* Status and Plan */}
            <div className="flex items-center gap-2 mb-4">
              {getStatusBadge(company.status)}
              {getPlanBadge(company.plan)}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{company.contact.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{company.contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe className="h-4 w-4" />
                <span className="truncate">{company.contact.address}</span>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Joined {formatDate(company.joinDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>{formatLastActive(company.lastActive)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new company.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button className="btn-primary">
                <Plus className="h-4 w-4" />
                Add Company
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Companies

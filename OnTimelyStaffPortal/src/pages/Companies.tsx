import React, { useState, useEffect } from 'react'
import { Search, Plus, Filter, MoreVertical, Building2, Users, Mail, Phone, MapPin } from 'lucide-react'
import { db } from '@/lib/database'
import { Company } from '@/lib/supabase'

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: '',
    domain: '',
    plan: 'Basic' as Company['plan'],
    admin_email: '',
    phone: '',
    address: '',
    max_users: 10
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    filterCompanies()
  }, [companies, searchTerm, statusFilter, planFilter])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const data = await db.companies.getCompanies()
      setCompanies(data)
    } catch (error) {
      console.error('Error loading companies:', error)
      // You could add a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.admin_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(company => company.status === statusFilter)
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(company => company.plan === planFilter)
    }

    setFilteredCompanies(filtered)
  }

  const handleCreateCompany = async () => {
    try {
      await db.companies.createCompany(newCompany)
      setShowCreateModal(false)
      setNewCompany({
        name: '',
        domain: '',
        plan: 'Basic',
        admin_email: '',
        phone: '',
        address: '',
        max_users: 10
      })
      loadCompanies() // Reload the list
    } catch (error) {
      console.error('Error creating company:', error)
      // You could add a toast notification here
    }
  }

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        await db.companies.deleteCompany(id)
        loadCompanies() // Reload the list
      } catch (error) {
        console.error('Error deleting company:', error)
        // You could add a toast notification here
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || statusClasses.inactive}`}>
        {status}
      </span>
    )
  }

  const getPlanBadge = (plan: string) => {
    const planClasses = {
      Basic: 'bg-blue-100 text-blue-800',
      Professional: 'bg-purple-100 text-purple-800',
      Enterprise: 'bg-indigo-100 text-indigo-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planClasses[plan as keyof typeof planClasses] || planClasses.Basic}`}>
        {plan}
      </span>
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600">Manage company accounts and subscriptions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Companies</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Enterprise Plans</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.plan === 'Enterprise').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce((sum, c) => sum + c.max_users, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Building2 className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500">{company.domain}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(company.status)}
                  {getPlanBadge(company.plan)}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {company.admin_email}
                </div>
                {company.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {company.phone}
                  </div>
                )}
                {company.address && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {company.address}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Max Users: {company.max_users}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-xs text-gray-500">
                  Created {new Date(company.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteCompany(company.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCompanies.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
          <p className="text-gray-600">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Company</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Company Name"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="input w-full"
              />
              <input
                type="text"
                placeholder="Domain"
                value={newCompany.domain}
                onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                className="input w-full"
              />
              <select
                value={newCompany.plan}
                onChange={(e) => setNewCompany({ ...newCompany, plan: e.target.value as Company['plan'] })}
                className="input w-full"
              >
                <option value="Basic">Basic</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
              <input
                type="email"
                placeholder="Admin Email"
                value={newCompany.admin_email}
                onChange={(e) => setNewCompany({ ...newCompany, admin_email: e.target.value })}
                className="input w-full"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={newCompany.phone}
                onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                className="input w-full"
              />
              <textarea
                placeholder="Address (optional)"
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                className="input w-full"
                rows={3}
              />
              <input
                type="number"
                placeholder="Max Users"
                value={newCompany.max_users}
                onChange={(e) => setNewCompany({ ...newCompany, max_users: parseInt(e.target.value) })}
                className="input w-full"
                min="1"
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCompany}
                className="btn-primary flex-1"
              >
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Companies

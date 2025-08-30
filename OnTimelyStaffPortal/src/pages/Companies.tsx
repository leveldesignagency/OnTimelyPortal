import React, { useState, useEffect } from 'react'
import { Search, Plus, /* Filter, */ MoreVertical, Building2, Users, /* Mail, Phone, MapPin */ } from 'lucide-react'
import { db } from '@/lib/database'
import { Company } from '@/lib/supabase'

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: '',
    subscription_plan: 'basic' as string,
    max_users: 5
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    filterCompanies()
  }, [companies, searchTerm, planFilter])

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
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(company => company.subscription_plan === planFilter)
    }

    setFilteredCompanies(filtered)
  }

  const handleCreateCompany = async () => {
    try {
      // Only send the fields that are provided, let Supabase handle defaults
      const companyData: any = { name: newCompany.name }
      
      if (newCompany.subscription_plan && newCompany.subscription_plan !== 'basic') {
        companyData.subscription_plan = newCompany.subscription_plan
      }
      
      if (newCompany.max_users && newCompany.max_users !== 5) {
        companyData.max_users = newCompany.max_users
      }

      await db.companies.createCompany(companyData)
      setShowCreateModal(false)
      setNewCompany({
        name: '',
        subscription_plan: 'basic',
        max_users: 5
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

  const getPlanBadge = (plan: string) => {
    const planClasses = {
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planClasses[plan as keyof typeof planClasses] || planClasses.basic}`}>
        {plan || 'basic'}
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
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce((sum, c) => sum + (c.max_users || 5), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Premium Plans</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.subscription_plan === 'premium').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Enterprise Plans</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.subscription_plan === 'enterprise').length}
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
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Plans</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
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
                    <p className="text-sm text-gray-500">ID: {company.id.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getPlanBadge(company.subscription_plan || 'basic')}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Max Users: {company.max_users || 5}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  Plan: {company.subscription_plan || 'basic'}
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
                placeholder="Company Name *"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="input w-full"
                required
              />
              <select
                value={newCompany.subscription_plan}
                onChange={(e) => setNewCompany({ ...newCompany, subscription_plan: e.target.value })}
                className="input w-full"
              >
                <option value="basic">Basic (default)</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <input
                type="number"
                placeholder="Max Users (default: 5)"
                value={newCompany.max_users}
                onChange={(e) => setNewCompany({ ...newCompany, max_users: parseInt(e.target.value) || 5 })}
                className="input w-full"
                min="1"
              />
              <p className="text-xs text-gray-500">
                * Company name is required. Subscription plan and max users will use defaults if not specified.
              </p>
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
                disabled={!newCompany.name.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
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

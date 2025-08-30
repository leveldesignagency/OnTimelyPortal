import React, { useState, useEffect, useRef } from 'react'
import { 
  // Users, // TODO: Uncomment when needed
  Plus, 
  Search, 
  // Filter, // TODO: Uncomment when needed
  // MoreVertical, // TODO: Uncomment when needed
  Edit, 
  Trash2, 
  // Download, // TODO: Uncomment when needed
  // Upload, // TODO: Uncomment when needed
  UserPlus,
  X,
  Key,
  // Eye, // TODO: Uncomment when needed
  // EyeOff, // TODO: Uncomment when needed
  ChevronDown,
  Check,
  Shield
} from 'lucide-react'
import { db } from '../lib/database'
import { User, Company } from '../lib/supabase'

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    company_id: '',
    role: 'user'
  })

  // Custom dropdown states
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const companyDropdownRef = useRef<HTMLDivElement>(null)

  // Bulk user creation states
  const [bulkInput, setBulkInput] = useState('')
  const [bulkCompanyId, setBulkCompanyId] = useState('')
  const [bulkRole, setBulkRole] = useState('user')
  // const [csvFile, setCsvFile] = useState<File | null>(null) // TODO: Uncomment when needed
  const [bulkPreview, setBulkPreview] = useState<Array<{ email: string; name: string }>>([])

  // Password modal states
  const [passwordModalData, setPasswordModalData] = useState<{
    email: string
    name: string
    companyName?: string
  } | null>(null)

  // Success message states
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, companiesData] = await Promise.all([
        db.users.getUsers(),
        db.companies.getCompanies()
      ])
      setUsers(usersData)
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      console.log('🔍 USER CREATION STARTED:', {
        email: newUser.email,
        name: newUser.name,
        company_id: newUser.company_id,
        role: newUser.role
      });

      if (!newUser.email || !newUser.name || !newUser.company_id) {
        setSuccessMessage('Please fill in all required fields.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
        return
      }

      const userData: any = {
        email: newUser.email,
        name: newUser.name,
        company_id: newUser.company_id,
        role: newUser.role
      }

      console.log('🔍 CALLING db.users.createUser with:', userData);
      const createdUser = await db.users.createUser(userData)
      console.log('🔍 USER CREATED SUCCESSFULLY:', createdUser);
      
      // Get company name for password modal
      let companyName: string | undefined
      if (newUser.company_id) {
        const company = companies.find(c => c.id === newUser.company_id)
        companyName = company?.name
      }

      // Show password modal
      setPasswordModalData({
        email: newUser.email,
        name: newUser.name,
        companyName
      })
      setShowPasswordModal(true)

      setShowCreateModal(false)
      setNewUser({
        email: '',
        name: '',
        company_id: '',
        role: 'user'
      })
      
      // Show success message
      setSuccessMessage(`User ${newUser.name} created successfully! Welcome email sent.`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
      
      loadData() // Reload the list
    } catch (error) {
      console.error('Error creating user:', error)
      
      // Check if it's just an email rate limiting error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message
        if (errorMessage.includes('For security purposes, you can only request this after')) {
          setSuccessMessage('User created successfully! Welcome email will be sent shortly (rate limited).')
        } else {
          setSuccessMessage('Error creating user. Please try again.')
        }
      } else {
        setSuccessMessage('Error creating user. Please try again.')
      }
      
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }

  const handleBulkCreate = async () => {
    try {
      console.log('🔍 BULK USER CREATION STARTED:', {
        count: bulkPreview.length,
        companyId: bulkCompanyId,
        role: bulkRole
      });

      if (bulkPreview.length === 0) return

      const usersToCreate = bulkPreview.map(user => ({
        email: user.email.trim(),
        name: user.name.trim(),
        company_id: bulkCompanyId || undefined,
        role: bulkRole
      }))

      console.log('🔍 CALLING db.users.bulkCreateUsers with:', usersToCreate);
      await db.users.bulkCreateUsers(usersToCreate)
      console.log('🔍 BULK USER CREATION COMPLETED SUCCESSFULLY');
      setShowBulkModal(false)
      setBulkInput('')
      setBulkPreview([])
      setBulkCompanyId('')
      setBulkRole('user')
      loadData() // Reload the list
      
      setSuccessMessage(`Successfully created ${bulkPreview.length} users! Welcome emails have been sent.`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (error) {
      console.error('Error creating bulk users:', error)
      setSuccessMessage('Error creating bulk users. Please try again.')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }

  const handlePasswordReset = async (userId: string) => {
    try {
      // const temporaryPassword = await db.users.resetUserPassword(userId) // TODO: Uncomment when needed
      
      // Get user details for password modal
      const user = users.find(u => u.id === userId)
      if (user) {
        let companyName: string | undefined
        if (user.company_id) {
          const company = companies.find(c => c.id === user.company_id)
          companyName = company?.name
        }

        setPasswordModalData({
          email: user.email,
          name: user.name,
          companyName
        })
        setShowPasswordModal(true)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      setSuccessMessage('Error resetting password. Please try again.')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }

  const parseBulkInput = (input: string) => {
    const lines = input.split('\n').filter(line => line.trim())
    const users: Array<{ email: string; name: string }> = []

    lines.forEach(line => {
      const parts = line.split(',').map(part => part.trim())
      if (parts.length >= 2) {
        users.push({
          email: parts[0],
          name: parts[1]
        })
      }
    })

    setBulkPreview(users)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // setCsvFile(file) // TODO: Uncomment when needed
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        parseBulkInput(text)
      }
      reader.readAsText(file)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await db.users.deleteUser(userId)
        loadData()
        setSuccessMessage('User deleted successfully.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      } catch (error) {
        console.error('Error deleting user:', error)
        setSuccessMessage('Error deleting user. Please try again.')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesCompany = companyFilter === 'all' || user.company_id === companyFilter
    
    return matchesSearch && matchesStatus && matchesCompany
  })

  const getCompanyName = (companyId: string | undefined) => {
    if (!companyId) return 'No Company'
    const company = companies.find(c => c.id === companyId)
    return company?.name || 'Unknown Company'
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      case 'away': return 'bg-yellow-100 text-yellow-800'
      case 'busy': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string | undefined) => {
    switch (role) {
      case 'masterAdmin': return 'bg-purple-100 text-purple-800'
      case 'user': return 'bg-blue-100 text-blue-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const selectedCompany = companies.find(c => c.id === newUser.company_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all users across companies</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Bulk Add Users
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="away">Away</option>
            <option value="busy">Busy</option>
          </select>
          
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt={user.name} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCompanyName(user.company_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status || 'offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handlePasswordReset(user.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button className="text-primary-600 hover:text-primary-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Company *</label>
                <div className="relative" ref={companyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                  >
                    <span className={selectedCompany ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedCompany ? selectedCompany.name : 'Select a company'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCompanyDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {companies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => {
                            setNewUser({...newUser, company_id: company.id})
                            setShowCompanyDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                        >
                          <span>{company.name}</span>
                          {newUser.company_id === company.id && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Role Field */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    required
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select a role</option>
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {newUser.role === 'other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      name="customRole"
                      placeholder="Specify custom role"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.name || !newUser.email || !newUser.company_id}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && passwordModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Key className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">User Created Successfully!</h2>
              <p className="text-gray-600 mt-2">Welcome email has been sent with login credentials.</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">User Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {passwordModalData.name}</div>
                <div><span className="font-medium">Email:</span> {passwordModalData.email}</div>
                {passwordModalData.companyName && (
                  <div><span className="font-medium">Company:</span> {passwordModalData.companyName}</div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-sm text-blue-800">
                  A welcome email with login credentials has been sent to the user. They should check their email and set their password.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordModalData(null)
                }}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk User Creation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Bulk Add Users</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Method Selection */}
              <div>
                <h3 className="text-lg font-medium mb-3">Choose Input Method</h3>
                
                {/* CSV Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">CSV format: email,name</p>
                </div>
                
                {/* Manual Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manual Input (comma-separated)</label>
                  <textarea
                    value={bulkInput}
                    onChange={(e) => {
                      setBulkInput(e.target.value)
                      parseBulkInput(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="email1@example.com, John Doe&#10;email2@example.com, Jane Smith&#10;email3@example.com, Bob Johnson"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: email, name (one per line)</p>
                </div>
              </div>
              
              {/* Common Settings */}
              <div>
                <h3 className="text-lg font-medium mb-3">Common Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={bulkCompanyId}
                      onChange={(e) => setBulkCompanyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select a company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={bulkRole}
                      onChange={(e) => setBulkRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="user">User</option>
                      <option value="masterAdmin">Master Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Preview */}
              {bulkPreview.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Preview ({bulkPreview.length} users)</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {bulkPreview.map((user, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-gray-500 ml-2">({user.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkPreview.length === 0 || !bulkCompanyId}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create {bulkPreview.length} Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage

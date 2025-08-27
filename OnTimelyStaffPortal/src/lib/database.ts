import { supabase, Company, User, SupportTicket, SystemMetric } from './supabase'

// Company Management
export const companyService = {
  // Get all companies
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get company by ID
  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new company
  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert([{
        ...companyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update company
  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete company
  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get company statistics
  async getCompanyStats(companyId: string) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, status')
      .eq('company_id', companyId)
    
    if (usersError) throw usersError

    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(u => u.status === 'active').length || 0

    return { totalUsers, activeUsers }
  }
}

// User Management
export const userService = {
  // Get all users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        companies (
          name,
          domain
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get users by company
  async getUsersByCompany(companyId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create new user
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Bulk create users
  async bulkCreateUsers(usersData: Omit<User, 'id' | 'created_at' | 'updated_at'>[]): Promise<User[]> {
    const usersWithTimestamps = usersData.map(user => ({
      ...user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('users')
      .insert(usersWithTimestamps)
      .select()
    
    if (error) throw error
    return data || []
  },

  // Update user
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Update user status
  async updateUserStatus(id: string, status: User['status']): Promise<User> {
    return this.updateUser(id, { status })
  }
}

// Support Ticket Management
export const supportService = {
  // Get all tickets
  async getTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users (
          full_name,
          email
        ),
        companies (
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create ticket
  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{
        ...ticketData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update ticket
  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get ticket statistics
  async getTicketStats() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, priority')
    
    if (error) throw error

    const stats = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      highPriority: 0
    }

    data?.forEach(ticket => {
      if (ticket.status === 'open') stats.open++
      else if (ticket.status === 'in-progress') stats.inProgress++
      else if (ticket.status === 'resolved') stats.resolved++
      else if (ticket.status === 'closed') stats.closed++
      
      if (ticket.priority === 'high' || ticket.priority === 'critical') stats.highPriority++
    })

    return stats
  }
}

// Analytics and System Metrics
export const analyticsService = {
  // Get system metrics
  async getSystemMetrics(): Promise<SystemMetric[]> {
    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data || []
  },

  // Get user activity
  async getUserActivity(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('users')
      .select('created_at, last_active')
      .gte('created_at', startDate.toISOString())
    
    if (error) throw error

    // Group by date
    const activityByDate: Record<string, { newUsers: number; activeUsers: number }> = {}
    
    data?.forEach(user => {
      const date = user.created_at.split('T')[0]
      if (!activityByDate[date]) {
        activityByDate[date] = { newUsers: 0, activeUsers: 0 }
      }
      activityByDate[date].newUsers++
      
      if (user.last_active && new Date(user.last_active) >= startDate) {
        activityByDate[date].activeUsers++
      }
    })

    return Object.entries(activityByDate).map(([date, stats]) => ({
      date,
      ...stats
    }))
  },

  // Get company growth
  async getCompanyGrowth(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('companies')
      .select('created_at, plan')
      .gte('created_at', startDate.toISOString())
    
    if (error) throw error

    const growthByDate: Record<string, { total: number; basic: number; professional: number; enterprise: number }> = {}
    
    data?.forEach(company => {
      const date = company.created_at.split('T')[0]
      if (!growthByDate[date]) {
        growthByDate[date] = { total: 0, basic: 0, professional: 0, enterprise: 0 }
      }
      growthByDate[date].total++
      growthByDate[date][company.plan.toLowerCase() as keyof typeof growthByDate[string]]++
    })

    return Object.entries(growthByDate).map(([date, stats]) => ({
      date,
      ...stats
    }))
  }
}

// Export all services
export const db = {
  companies: companyService,
  users: userService,
  support: supportService,
  analytics: analyticsService
}

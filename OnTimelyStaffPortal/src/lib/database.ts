import { supabase, Company, User, Team, TeamMember, Chat, Message, SupportTicket, SystemMetric } from './supabase'
import { emailService } from './email'
import { generateTemporaryPassword } from './utils'

// Company Management - using your existing companies table
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

  // Create new company - let Supabase handle defaults and triggers
  async createCompany(companyData: { name: string; subscription_plan?: string; max_users?: number }): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert([companyData]) // Supabase will handle id, created_at, updated_at automatically
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update company - let Supabase handle the updated_at trigger
  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update(updates) // Supabase will handle updated_at automatically via trigger
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
    const onlineUsers = users?.filter(u => u.status === 'online').length || 0

    return { totalUsers, onlineUsers }
  }
}

// User Management - using your existing users table with Supabase Auth
export const userService = {
  // Get all users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        companies (
          name,
          subscription_plan
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

  // Create new user with Supabase Auth - let Supabase handle defaults and triggers
  async createUser(userData: { 
    email: string; 
    name: string; 
    company_id?: string; 
    role?: string; 
    status?: string; 
  }): Promise<User> {
    try {
      console.log('🔍 DATABASE: createUser called with:', userData);
      
      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword()
      console.log('🔍 DATABASE: Generated temporary password');
      
      // Create user with Supabase Auth and profile
      console.log('🔍 DATABASE: Calling emailService.createUserWithAuth...');
      const result = await emailService.createUserWithAuth({
        ...userData,
        password: temporaryPassword
      })
      console.log('🔍 DATABASE: emailService.createUserWithAuth completed:', {
        hasProfile: !!result.profile,
        hasAuth: !!result.auth,
        profileId: result.profile?.id
      });
      
      // Return the profile data
      return result.profile
    } catch (error) {
      console.error('❌ DATABASE: Error creating user:', error)
      throw error
    }
  },

  // Bulk create users with Supabase Auth - let Supabase handle defaults and triggers
  async bulkCreateUsers(usersData: Array<{ 
    email: string; 
    name: string; 
    company_id?: string; 
    role?: string; 
    status?: string; 
  }>): Promise<User[]> {
    try {
      // Use the email service for bulk creation with Supabase Auth
      const results = await emailService.bulkCreateUsersWithAuth(usersData)
      
      // Return just the profile data
      return results.map(result => result.profile)
    } catch (error) {
      console.error('Error creating bulk users:', error)
      throw error
    }
  },

  // Update user - let Supabase handle the updated_at trigger
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates) // Supabase will handle updated_at automatically via trigger
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
  async updateUserStatus(id: string, status: string): Promise<User> {
    return this.updateUser(id, { status })
  },

  // Reset user password and send new temporary password via Supabase Auth
  async resetUserPassword(userId: string): Promise<string> {
    try {
      const temporaryPassword = await emailService.resetUserPassword(userId)
      return temporaryPassword
    } catch (error) {
      console.error('Error resetting user password:', error)
      throw error
    }
  }
}

// Team Management - using your existing teams table
export const teamService = {
  // Get teams by company
  async getTeamsByCompany(companyId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get team members
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// Chat Management - using your existing chats table
export const chatService = {
  // Get chats by company
  async getChatsByCompany(companyId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get messages for a chat
  async getChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }
}

// Support Ticket Management - this will need to be created in your existing database
export const supportService = {
  // Get all tickets
  async getTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users (
          name,
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
      .insert([ticketData]) // Supabase will handle id, created_at, updated_at automatically
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update ticket
  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates) // Supabase will handle updated_at automatically via trigger
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
      .select('created_at, last_seen')
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
      
      if (user.last_seen && new Date(user.last_seen) >= startDate) {
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
      .select('created_at, subscription_plan')
      .gte('created_at', startDate.toISOString())
    
    if (error) throw error

    const growthByDate: Record<string, { total: number; basic: number; premium: number; enterprise: number }> = {}
    
    data?.forEach(company => {
      const date = company.created_at.split('T')[0]
      if (!growthByDate[date]) {
        growthByDate[date] = { total: 0, basic: 0, premium: 0, enterprise: 0 }
      }
      growthByDate[date].total++
      growthByDate[date][company.subscription_plan as keyof typeof growthByDate[string]]++
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
  teams: teamService,
  chats: chatService,
  support: supportService,
  analytics: analyticsService
}

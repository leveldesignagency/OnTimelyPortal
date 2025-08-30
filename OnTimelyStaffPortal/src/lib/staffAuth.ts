import { supabase } from './supabase'

export interface StaffMember {
  id: string
  email: string
  name: string
  role: 'director' | 'admin' | 'staff'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthState {
  user: StaffMember | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

class StaffAuthService {
  private currentUser: StaffMember | null = null
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  }

  // Initialize auth state
  async init(): Promise<AuthState> {
    try {
      // Check if user is already logged in
      const session = await this.getCurrentSession()
      if (session) {
        await this.fetchCurrentUser(session.email)
      }
      
      this.authState.isLoading = false
      return this.authState
    } catch (error) {
      this.authState.isLoading = false
      this.authState.error = 'Failed to initialize authentication'
      return this.authState
    }
  }

  // Get current session from localStorage
  private getCurrentSession(): { email: string; token: string } | null {
    const session = localStorage.getItem('ontimely_staff_session')
    if (session) {
      try {
        return JSON.parse(session)
      } catch {
        localStorage.removeItem('ontimely_staff_session')
        return null
      }
    }
    return null
  }

  // Store session in localStorage
  private storeSession(email: string, token: string): void {
    localStorage.setItem('ontimely_staff_session', JSON.stringify({ email, token }))
  }

  // Clear session from localStorage
  private clearSession(): void {
    localStorage.removeItem('ontimely_staff_session')
  }

  // Login staff member - SIMPLE PASSWORD CHECK
  async login(credentials: LoginCredentials): Promise<AuthState> {
    try {
      this.authState.isLoading = true
      this.authState.error = null

      // Get staff member from database
      const { data: staffMember, error: staffError } = await supabase
        .from('ontimely_staff')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .single()

      if (staffError || !staffMember) {
        throw new Error('Invalid credentials or account not found')
      }

      // SIMPLE: Just check if password matches what's stored
      if (staffMember.password_hash !== credentials.password) {
        console.log('Password check:', {
          entered: credentials.password,
          stored: staffMember.password_hash
        })
        throw new Error('Invalid password')
      }

      // Update last login
      await supabase
        .from('ontimely_staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staffMember.id)

      // Store session
      const token = this.generateSimpleToken(staffMember.email)
      this.storeSession(staffMember.email, token)

      // Set current user
      this.currentUser = staffMember
      this.authState.user = staffMember
      this.authState.isAuthenticated = true
      this.authState.isLoading = false

      return this.authState
    } catch (error) {
      this.authState.error = error instanceof Error ? error.message : 'Login failed'
      this.authState.isLoading = false
      this.authState.isAuthenticated = false
      return this.authState
    }
  }

  // Logout staff member
  async logout(): Promise<AuthState> {
    this.clearSession()
    this.currentUser = null
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    }
    return this.authState
  }

  // Get current authenticated user
  async getCurrentUser(): Promise<StaffMember | null> {
    if (this.currentUser) {
      return this.currentUser
    }

    const session = this.getCurrentSession()
    if (session) {
      await this.fetchCurrentUser(session.email)
      return this.currentUser
    }

    return null
  }

  // Fetch current user from database
  private async fetchCurrentUser(email: string): Promise<void> {
    try {
      const { data: staffMember, error } = await supabase
        .from('ontimely_staff')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !staffMember) {
        this.clearSession()
        return
      }

      this.currentUser = staffMember
      this.authState.user = staffMember
      this.authState.isAuthenticated = true
    } catch (error) {
      this.clearSession()
    }
  }

  // Check if user has specific role
  hasRole(role: 'director' | 'admin' | 'staff'): boolean {
    if (!this.currentUser) return false
    
    const roleHierarchy = { director: 3, admin: 2, staff: 1 }
    return roleHierarchy[this.currentUser.role] >= roleHierarchy[role]
  }

  // Check if user is director
  isDirector(): boolean {
    return this.hasRole('director')
  }

  // Check if user is admin or higher
  isAdmin(): boolean {
    return this.hasRole('admin')
  }

  // Check if user is staff or higher
  isStaff(): boolean {
    return this.hasRole('staff')
  }

  // Generate simple token (for demo purposes)
  private generateSimpleToken(email: string): string {
    return btoa(`${email}:${Date.now()}`)
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }
}

// Export singleton instance
export const staffAuth = new StaffAuthService()

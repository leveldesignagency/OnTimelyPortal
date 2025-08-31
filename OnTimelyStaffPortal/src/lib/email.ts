import { supabase, supabaseAdmin } from './supabase'
// Removed unused imports - now using Edge Functions instead

export interface WelcomeEmailData {
  email: string
  name: string
  temporaryPassword: string
  companyName?: string
}

export const emailService = {
  // Create user with Supabase Auth and send welcome email
  async createUserWithAuth(userData: { 
    email: string; 
    password: string; 
    name: string; 
    company_id?: string; 
    role?: string; 
    status?: string; 
  }): Promise<any> {
    try {
      console.log('Starting user creation for:', userData.email)
      
      // Get company name for the company_name field first
      let companyName = null
      if (userData.company_id) {
        try {
          const { data: companyData } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', userData.company_id)
            .single()
          companyName = companyData?.name
        } catch (error) {
          console.warn('Could not fetch company name:', error)
        }
      }

      // FIRST: Create the Supabase Auth user (unconfirmed) with retry logic
      console.log('Creating Supabase Auth user...')
      
      // Retry function for rate limiting
      const createAuthUserWithRetry = async (attempts = 0): Promise<any> => {
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                name: userData.name,
                company_id: userData.company_id,
                role: userData.role || 'user',
                status: userData.status || 'offline'
              },
              emailRedirectTo: 'https://dashboard.ontimely.co.uk/confirm-account'
            }
          })
          
          if (authError) {
            // Check if it's a rate limit error
            if (authError.message.includes('For security purposes, you can only request this after') && attempts < 3) {
              const waitTime = Math.pow(2, attempts) * 1000 + 5000 // Exponential backoff: 5s, 7s, 9s
              console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempts + 1}/3...`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
              return createAuthUserWithRetry(attempts + 1)
            }
            throw authError
          }
          
          return { data: authData, error: null }
        } catch (error) {
          if (attempts < 3 && error instanceof Error && error.message?.includes('For security purposes, you can only request this after')) {
            const waitTime = Math.pow(2, attempts) * 1000 + 5000
            console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempts + 1}/3...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            return createAuthUserWithRetry(attempts + 1)
          }
          throw error
        }
      }
      
      const { data: authData } = await createAuthUserWithRetry()

      if (!authData.user) {
        throw new Error('Supabase Auth user creation succeeded but no user data returned')
      }

      console.log('Supabase Auth user created successfully:', authData.user.id)

      // SECOND: Create user profile using the Supabase Auth ID
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: authData.user.id, // Use the Supabase Auth ID here!
          email: userData.email,
          name: userData.name,
          company_id: userData.company_id,
          role: userData.role || 'user',
          status: userData.status || 'offline',
          avatar: '', // Default value
          company_name: companyName, // Set company name for data analysis
          avatar_url: null,
          description: null,
          company_role: null
          // created_at, updated_at, last_seen are handled by defaults/triggers
        }])
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation failed:', profileError)
        // If profile creation fails, we should clean up the auth user
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          console.log('Cleaned up Supabase Auth user after profile creation failure')
        } catch (cleanupError) {
          console.warn('Failed to clean up Supabase Auth user:', cleanupError)
        }
        throw profileError
      }

      console.log('User profile created successfully with matching ID:', profileData.id)

      // Try to send welcome email, but don't fail if it doesn't work
      try {
        // Send confirmation email for the unconfirmed user
        await this.sendWelcomeEmailViaSupabase({
          email: userData.email,
          name: userData.name,
          temporaryPassword: userData.password,
          companyName: companyName
        })
      } catch (emailError) {
        console.warn('Email sending failed, but user was created successfully:', emailError)
        // Don't throw this error - user creation succeeded
      }

      return { profile: profileData, auth: authData.user } // Return both profile and auth data for UI
    } catch (error) {
      console.error('Error creating user with auth:', error)
      throw error
    }
  },

  // Send welcome email through Resend
  async sendWelcomeEmailViaSupabase(data: WelcomeEmailData): Promise<void> {
    console.log('🔍 STARTING EMAIL SEND PROCESS:', {
      email: data.email,
      name: data.name,
      companyName: data.companyName
    });
    
    try {
      // Generate confirmation URL with token
      const confirmationUrl = `https://dashboard.ontimely.co.uk/confirm-account?token=${encodeURIComponent(data.email)}&type=signup`;
      console.log('🔍 CONFIRMATION URL:', confirmationUrl);
      
      // Send professional confirmation email via Edge Function (bypasses Vercel network restrictions)
      console.log('🔍 CALLING Edge Function for email...');
      
      const response = await fetch('/api/send-account-confirmation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          companyName: data.companyName,
          confirmationUrl: confirmationUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Edge Function failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Edge Function email result:', result);

      console.log(`✅ Professional confirmation email sent successfully to ${data.email} via Edge Function`)
    } catch (error) {
      console.error('❌ Error sending confirmation email via Edge Function:', error);
      console.error('❌ ERROR DETAILS:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
              // Fallback to simple email template via Edge Function
        try {
          console.log('🔍 TRYING FALLBACK EMAIL via Edge Function...');
          const confirmationUrl = `https://dashboard.ontimely.co.uk/confirm-account?token=${encodeURIComponent(data.email)}&type=signup`;
          
          const fallbackResponse = await fetch('/api/send-account-confirmation-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: data.email,
              name: data.name,
              companyName: data.companyName,
              confirmationUrl: confirmationUrl
            })
          });

          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            throw new Error(`Fallback Edge Function failed: ${errorData.error || fallbackResponse.statusText}`);
          }

          const fallbackResult = await fallbackResponse.json();
          console.log('✅ Fallback Edge Function email result:', fallbackResult);
        } catch (fallbackError) {
          console.error('❌ Fallback email also failed:', fallbackError);
          // Don't throw error - user creation should still succeed
        }
    }
  },

  // Bulk create users with Supabase Auth
  async bulkCreateUsersWithAuth(usersData: Array<{ 
    email: string; 
    name: string; 
    company_id?: string; 
    role?: string; 
    status?: string; 
  }>): Promise<any[]> {
    try {
      const results = []
      
      for (const userData of usersData) {
        try {
          // Generate temporary password for each user
          const temporaryPassword = this.generateTemporaryPassword()
          
          const result = await this.createUserWithAuth({
            ...userData,
            password: temporaryPassword
          })
          
          results.push(result)
        } catch (error) {
          console.error(`Failed to create user ${userData.email}:`, error)
          // Continue with other users even if one fails
        }
      }

      return results
    } catch (error) {
      console.error('Error in bulk user creation:', error)
      throw error
    }
  },

  // Generate temporary password
  generateTemporaryPassword(): string {
    const length = 12
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    // Ensure at least one character from each category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)] // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)] // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)] // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)] // Special character
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle the password to make it more random
    return password.split('').sort(() => Math.random() - 0.5).join('')
  },

  // Get company name for emails
  async getCompanyName(companyId: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()
      
      if (error) throw error
      return data?.name
    } catch (error) {
      console.warn('Could not fetch company name:', error)
      return undefined
    }
  },

  // Reset user password via Supabase Auth
  async resetUserPassword(userId: string): Promise<string> {
    try {
      // Get user email from profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, name, company_id')
        .eq('id', userId)
        .single()
      
      if (userError) throw userError

      // Generate new temporary password
      const newPassword = this.generateTemporaryPassword()

      // Send password reset email
      await this.sendWelcomeEmailViaSupabase({
        email: user.email,
        name: user.name,
        temporaryPassword: newPassword,
        companyName: user.company_id ? await this.getCompanyName(user.company_id) : undefined
      })

      return newPassword
    } catch (error) {
      console.error('Error resetting user password:', error)
      throw error
    }
  },

        // Send password reset email using the same flow as desktop app
      async sendPasswordResetEmail(email: string, name: string, /* companyId?: string */): Promise<void> {
        try {
          // First check if user exists in database
          const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

          if (userCheckError || !existingUser) {
            throw new Error('Email not found in database')
          }

          // Use Edge Function for password reset emails
          const resetUrl = `https://ontimely.co.uk/set-initial-password?token=${encodeURIComponent(email)}&type=recovery`;
          
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              name: name,
              companyName: undefined,
              confirmationUrl: resetUrl
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Edge Function failed: ${errorData.error || response.statusText}`);
          }

          console.log(`✅ Password reset email sent successfully to ${email} via Edge Function`)
        } catch (error) {
          console.error('Error sending password reset email:', error)
          throw error
        }
      }
}

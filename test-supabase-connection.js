// Test Supabase connection and check if users exist
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ijsktwmevnqgzwwuggkf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2t0d21ldm5xZ3p3d3VnZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDU4MTYsImV4cCI6MjA2NjI4MTgxNn0.w4eBL4hOZoAOo33ZXX-lSqQmIuSoP3fBEO1lBlpIRNw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔗 Testing Supabase connection...')
  console.log('URL:', supabaseUrl)
  console.log('Key:', supabaseAnonKey.substring(0, 50) + '...')
  
  try {
    // Test basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError.message)
      return
    }
    
    console.log('✅ Connection successful!')
    
    // Check if users table exists and has data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Users query failed:', usersError.message)
      return
    }
    
    console.log('👥 Users found:', users?.length || 0)
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) - ID: ${user.id}`)
      })
    }
    
    // Test specific user lookup
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '22222222-2222-2222-2222-222222222222')
      .single()
    
    if (adminError) {
      console.error('❌ Admin user not found:', adminError.message)
    } else {
      console.log('✅ Admin user found:', adminUser.email)
    }
    
    const { data: regularUser, error: regularError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '33333333-3333-3333-3333-333333333333')
      .single()
    
    if (regularError) {
      console.error('❌ Regular user not found:', regularError.message)
    } else {
      console.log('✅ Regular user found:', regularUser.email)
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message)
  }
}

testConnection() 
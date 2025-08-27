// Simple password hashing utility for staff accounts
// In production, you should use a proper bcrypt implementation

export const passwordUtils = {
  // Simple hash function for demo purposes
  // In production, use bcrypt or similar
  hashPassword(password: string): string {
    // This is a very basic hash - NOT secure for production!
    // For production, use: bcrypt.hashSync(password, 10)
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `demo_hash_${Math.abs(hash)}`
  },

  // Verify password against hash
  verifyPassword(password: string, hash: string): boolean {
    const computedHash = this.hashPassword(password)
    return computedHash === hash
  },

  // Generate a secure random password
  generateSecurePassword(length: number = 12): string {
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
  }
}

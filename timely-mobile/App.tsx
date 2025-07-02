import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import LoginScreen from './screens/LoginScreen'
import TimelineScreen from './screens/TimelineScreen'
import GuestsScreen from './screens/GuestsScreen'
import { getCurrentUser, AuthUser } from './lib/auth'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuthState = async () => {
    try {
      const { user, error } = await getCurrentUser()
      if (user && !error) {
        setCurrentUser(user)
        setIsLoggedIn(true)
      } else {
        setIsLoggedIn(false)
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show Timeline for all logged-in users (both guests and admins)
  if (currentUser) {
    return <TimelineScreen />
  }

  // Fallback (shouldn't reach here)
  return <LoginScreen onLogin={handleLogin} />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
})

      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show Timeline for all logged-in users (both guests and admins)
  if (currentUser) {
    return <TimelineScreen />
  }

  // Fallback (shouldn't reach here)
  return <LoginScreen onLogin={handleLogin} />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
})

      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show Timeline for all logged-in users (both guests and admins)
  if (currentUser) {
    return <TimelineScreen />
  }

  // Fallback (shouldn't reach here)
  return <LoginScreen onLogin={handleLogin} />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
})

      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show Timeline for all logged-in users (both guests and admins)
  if (currentUser) {
    return <TimelineScreen />
  }

  // Fallback (shouldn't reach here)
  return <LoginScreen onLogin={handleLogin} />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
})

      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show Timeline for all logged-in users (both guests and admins)
  if (currentUser) {
    return <TimelineScreen />
  }

  // Fallback (shouldn't reach here)
  return <LoginScreen onLogin={handleLogin} />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
})
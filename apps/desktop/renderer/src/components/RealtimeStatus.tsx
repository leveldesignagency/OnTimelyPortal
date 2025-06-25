import React from 'react'
import { useSupabaseConnection } from '../hooks/useRealtime'

const RealtimeStatus: React.FC = () => {
  const { isConnected, connectionError } = useSupabaseConnection()

  if (connectionError) {
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        padding: '8px 16px',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '6px',
        fontSize: '14px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'white',
          borderRadius: '50%'
        }} />
        Real-time: {connectionError}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        padding: '8px 16px',
        backgroundColor: '#f59e0b',
        color: 'white',
        borderRadius: '6px',
        fontSize: '14px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'white',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }} />
        Connecting...
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      borderRadius: '6px',
      fontSize: '14px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        backgroundColor: 'white',
        borderRadius: '50%'
      }} />
      Real-time: Connected
    </div>
  )
}

export default RealtimeStatus 
 
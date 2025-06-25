import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { login } from '../lib/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, error: loginError } = await login(email, password);
      if (loginError || !user) {
        setError(loginError || 'Login failed');
        return;
      }
      
      // Redirect to dashboard after successful login
      navigate('/');
    } catch (err) {
      setError('Login failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: isDark ? '#0f0f0f' : '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: isDark ? '#1a1a1a' : '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
        width: '400px',
        maxWidth: '90%',
        border: `1px solid ${isDark ? '#333' : '#e9ecef'}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: '28px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            Timely Events
          </h1>
          <p style={{
            color: isDark ? '#adb5bd' : '#6c757d',
            fontSize: '16px',
            margin: 0
          }}>
            Sign in to your organization
          </p>
        </div>
        
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: isDark ? '#adb5bd' : '#6c757d',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                borderRadius: '8px',
                background: isDark ? '#2a2a2a' : '#ffffff',
                color: isDark ? '#ffffff' : '#1a1a1a',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#228B22';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDark ? '#404040' : '#dee2e6';
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: isDark ? '#adb5bd' : '#6c757d',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                borderRadius: '8px',
                background: isDark ? '#2a2a2a' : '#ffffff',
                color: isDark ? '#ffffff' : '#1a1a1a',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#228B22';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDark ? '#404040' : '#dee2e6';
              }}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#ccc' : '#228B22',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ 
          marginTop: '30px', 
          padding: '16px',
          background: isDark ? '#2a2a2a' : '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`
        }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', color: isDark ? '#ffffff' : '#1a1a1a' }}>
            Test Organizations:
          </div>
          <div style={{ color: isDark ? '#adb5bd' : '#6c757d', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Test Company (Admin):</strong><br/>
              admin@testcompany.com / admin123
            </div>
            <div>
              <strong>Test Company (User):</strong><br/>
              user@testcompany.com / user123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
 
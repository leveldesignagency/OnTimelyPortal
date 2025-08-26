import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { supabase } from '../lib/supabase';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  // Shimmer effect for background
  useEffect(() => {
    const shimmerElements = document.querySelectorAll('.shimmer-bg');
    
    shimmerElements.forEach((el, index) => {
      const delay = index * 2; // Stagger the animations
      (el as HTMLElement).style.animationDelay = `${delay}s`;
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 LoginPage - Login attempt started');
    console.log('🔐 LoginPage - Email:', email);
    console.log('🔐 LoginPage - Supabase available:', !!supabase);
    console.log('🔐 LoginPage - Supabase auth methods:', Object.keys(supabase?.auth || {}));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('🔐 LoginPage - Supabase response:', { data, error });

      if (error) {
        console.error('🔐 LoginPage - Login error:', error);
        setError(error.message);
      } else {
        console.log('🔐 LoginPage - Login successful:', data);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('🔐 LoginPage - Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
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
      background: 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Shimmer Background Elements */}
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute',
          top: '15%',
          left: '8%',
          width: 120,
          height: 120,
          background: 'rgba(34,197,94,0.15)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          animation: 'shimmer 8s ease-in-out infinite',
          zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute',
          bottom: '25%',
          right: '12%',
          width: 180,
          height: 180,
          background: 'rgba(34,197,94,0.1)',
          borderRadius: '50%',
          filter: 'blur(25px)',
          animation: 'shimmer 10s ease-in-out infinite reverse',
          zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute',
          top: '60%',
          left: '25%',
          width: 100,
          height: 100,
          background: 'rgba(34,197,94,0.12)',
          borderRadius: '50%',
          filter: 'blur(18px)',
          animation: 'shimmer 12s ease-in-out infinite',
          zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute',
          top: '30%',
          right: '30%',
          width: 80,
          height: 80,
          background: 'rgba(34,197,94,0.08)',
          borderRadius: '50%',
          filter: 'blur(15px)',
          animation: 'shimmer 9s ease-in-out infinite reverse',
          zIndex: 1
        }}
      />

      {/* Main Container - Glassmorphic design matching forms.html */}
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.55)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        zIndex: 10,
        position: 'relative'
      }}>
        
        {/* Header - matching forms.html header styling */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          color: '#e5e7eb',
          padding: '36px 40px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '10px',
            fontWeight: '700',
            color: '#e5e7eb'
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            color: '#22c55e',
            fontWeight: '600'
          }}>
            Sign in to your Timely account
          </p>
        </div>

        {/* Form Container - matching forms.html form-container styling */}
        <div style={{
          padding: '40px'
        }}>
          
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#fecaca',
              padding: '16px',
              borderRadius: '10px',
              textAlign: 'center',
              marginBottom: '20px',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>❌ Login Failed</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            
            {/* Email Field */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#cbd5e1',
                fontSize: '14px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#e5e7eb',
                  fontSize: '16px',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(34,197,94,0.6)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.06)';
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
                required
              />
            </div>
            
            {/* Password Field */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#cbd5e1',
                fontSize: '14px'
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
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#e5e7eb',
                  fontSize: '16px',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(34,197,94,0.6)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.06)';
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
                required
              />
              
              {/* Forgot Password Link */}
              <div style={{ 
                textAlign: 'right', 
                marginTop: '8px' 
              }}>
                <a
                  href="https://dashboard.ontimely.co.uk/reset-password"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#22c55e',
                    fontSize: '14px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.opacity = '1';
                  }}
                >
                  Forgot Password?
                </a>
              </div>
            </div>
            
            {/* Submit Button - matching forms.html submit-btn styling */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(180deg, #22c55e, #16a34a)',
                color: loading ? 'rgba(255,255,255,0.6)' : '#0b1411',
                padding: '14px 28px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                boxShadow: loading ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 24px rgba(34,197,94,0.25)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Signing In...
                </div>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { 
            transform: translateY(0px) scale(1) rotate(0deg);
            opacity: 0.6;
          }
          25% { 
            transform: translateY(-15px) scale(1.1) rotate(90deg);
            opacity: 0.8;
          }
          50% { 
            transform: translateY(10px) scale(0.9) rotate(180deg);
            opacity: 0.4;
          }
          75% { 
            transform: translateY(-8px) scale(1.05) rotate(270deg);
            opacity: 0.7;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage; 
 
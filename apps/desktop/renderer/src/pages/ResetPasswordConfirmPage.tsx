import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { supabase } from '../lib/supabase';

const ResetPasswordConfirmPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  // Check if we have access token in URL
  useEffect(() => {
    const hash = location.hash;
    const searchParams = new URLSearchParams(location.search);
    console.log('ResetPasswordConfirmPage - URL hash:', hash);
    console.log('ResetPasswordConfirmPage - URL search params:', location.search);
    
    // Check for access token in hash (Supabase default)
    if (hash && hash.includes('access_token')) {
      console.log('ResetPasswordConfirmPage - Access token detected in hash');
      
      // Extract access token and set it in Supabase session
      const accessToken = hash.match(/access_token=([^&]+)/)?.[1];
      if (accessToken) {
        console.log('ResetPasswordConfirmPage - Setting access token in session');
        // Set the session manually for password reset
        supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
      }
    } 
    // Check for access token in search params (alternative format)
    else if (searchParams.has('access_token')) {
      console.log('ResetPasswordConfirmPage - Access token detected in search params');
      const accessToken = searchParams.get('access_token');
      if (accessToken) {
        console.log('ResetPasswordConfirmPage - Setting access token in session from search params');
        supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
      }
    }
    // Check for type parameter (Supabase password reset indicator)
    else if (searchParams.get('type') === 'recovery') {
      console.log('ResetPasswordConfirmPage - Recovery type detected, checking for token');
      // This is a password reset link, but we need to extract the token differently
      // The token might be in the hash or we need to handle it differently
      if (hash) {
        const accessToken = hash.match(/access_token=([^&]+)/)?.[1];
        if (accessToken) {
          console.log('ResetPasswordConfirmPage - Setting access token from recovery hash');
          supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
        }
      }
    }
    // Check for Supabase password reset flow
    else if (searchParams.get('type') === 'recovery' || searchParams.get('type') === 'signup') {
      console.log('ResetPasswordConfirmPage - Supabase auth flow detected:', searchParams.get('type'));
      // Let Supabase handle the auth flow automatically
      // Don't redirect to login, let the component render
    }
    else {
      console.log('ResetPasswordConfirmPage - No access token found, showing error message');
      setError('Invalid or expired password reset link. Please request a new one.');
      // Don't redirect immediately, let user see the error
    }
  }, [location, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must meet all requirements: 8+ characters, uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    try {
      // First, ensure we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No valid session found. Please use the reset link from your email.');
        setLoading(false);
        return;
      }

      console.log('ResetPasswordConfirmPage - Updating password for user:', session.user.email);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('ResetPasswordConfirmPage - Password update error:', error);
        setError(error.message);
      } else {
        console.log('ResetPasswordConfirmPage - Password updated successfully');
        setSuccess('Password updated successfully! Redirecting to login...');
        
        // Sign out the user after password reset
        await supabase.auth.signOut();
        
        // Clear any local storage or session data
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('ResetPasswordConfirmPage - Unexpected error:', error);
      setError('Failed to update password. Please try again.');
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
          position: 'absolute', top: '15%', left: '8%', width: 120, height: 120,
          background: 'rgba(34,197,94,0.15)', borderRadius: '50%', filter: 'blur(20px)',
          animation: 'shimmer 8s ease-in-out infinite', zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute', bottom: '25%', right: '12%', width: 180, height: 180,
          background: 'rgba(34,197,94,0.1)', borderRadius: '50%', filter: 'blur(25px)',
          animation: 'shimmer 10s ease-in-out infinite reverse', zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute', top: '60%', left: '25%', width: 100, height: 100,
          background: 'rgba(34,197,94,0.12)', borderRadius: '50%', filter: 'blur(18px)',
          animation: 'shimmer 12s ease-in-out infinite', zIndex: 1
        }}
      />
      <div 
        className="shimmer-bg"
        style={{
          position: 'absolute', top: '30%', right: '30%', width: 80, height: 80,
          background: 'rgba(34,197,94,0.08)', borderRadius: '50%', filter: 'blur(15px)',
          animation: 'shimmer 9s ease-in-out infinite reverse', zIndex: 1
        }}
      />

      {/* Main Container - Glassmorphic design */}
      <div style={{
        maxWidth: '480px', width: '100%', background: 'rgba(17, 24, 39, 0.55)',
        borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)', overflow: 'hidden', zIndex: 10, position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          color: '#e5e7eb', padding: '36px 40px', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '700', color: '#e5e7eb' }}>
            Reset Your Password
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, color: '#22c55e', fontWeight: '600' }}>
            Enter your new password below
          </p>
        </div>
        
        {/* Form Container */}
        <div style={{ padding: '40px' }}>
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px', padding: '16px', marginBottom: '20px',
              color: '#fca5a5', fontSize: '14px'
            }}>
              <div style={{ marginBottom: '12px' }}>{error}</div>
              <button
                onClick={() => navigate('/reset-password')}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#fca5a5',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                }}
              >
                Request New Link
              </button>
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px', padding: '12px', marginBottom: '20px',
              color: '#86efac', fontSize: '14px'
            }}>
              {success}
            </div>
          )}
          
          <form onSubmit={handlePasswordReset}>
            
            {/* New Password Field */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '14px' }}>
                New Password
              </label>
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                style={{
                  width: '100%', padding: '16px 20px', fontSize: '16px',
                  background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px', color: '#e5e7eb', outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#22c55e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>
            
            {/* Confirm Password Field */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '14px' }}>
                Confirm Password
              </label>
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                style={{
                  width: '100%', padding: '16px 20px', fontSize: '16px',
                  background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px', color: '#e5e7eb', outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#22c55e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>
            
            {/* Password Requirements with Visual Indicators */}
            <div style={{ marginBottom: '30px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#22c55e', fontSize: '14px' }}>Password Requirements:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>
                <li style={{ color: newPassword.length >= 8 ? '#22c55e' : '#9ca3af' }}>
                  {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                </li>
                <li style={{ color: /[A-Z]/.test(newPassword) ? '#22c55e' : '#9ca3af' }}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                </li>
                <li style={{ color: /[a-z]/.test(newPassword) ? '#22c55e' : '#9ca3af' }}>
                  {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
                </li>
                <li style={{ color: /\d/.test(newPassword) ? '#22c55e' : '#9ca3af' }}>
                  {/\d/.test(newPassword) ? '✓' : '○'} One number
                </li>
                <li style={{ color: /[@$!%*?&]/.test(newPassword) ? '#22c55e' : '#9ca3af' }}>
                  {/[@$!%*?&]/.test(newPassword) ? '✓' : '○'} One special character (@$!%*?&)
                </li>
              </ul>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(180deg, #22c55e, #16a34a)',
                color: loading ? 'rgba(255,255,255,0.6)' : '#0b1411',
                padding: '14px 28px', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', fontSize: '16px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
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
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #ffffff', borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Updating Password...
                </div>
              ) : 'Reset Password'}
            </button>
          </form>
          
          {/* Back to Login Link */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent', border: 'none', color: '#22c55e',
                fontSize: '14px', cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              ← Back to Login
            </button>
          </div>
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

export default ResetPasswordConfirmPage;

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPasswordConfirmPage = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email from URL if present
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

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
      // Simple password reset - no session needed
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        setError(error.message);
      } else {
        console.log('Password updated successfully');
        setSuccess('Password updated successfully! Redirecting to login...');
        
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
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
          color: '#e5e7eb', padding: '28px 40px', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', fontWeight: '700', color: '#e5e7eb' }}>
            Reset Your Password
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.9, color: '#22c55e', fontWeight: '600' }}>
            Enter your email and new password below
          </p>
        </div>
        
        {/* Form Container */}
        <div style={{ padding: '32px' }}>
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px', padding: '20px', marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#fca5a5', marginBottom: '16px', fontSize: '16px' }}>
                {error}
              </div>
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
            
            {/* Email Field */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '14px' }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
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
                background: 'transparent', border: '1px solid #22c55e', color: '#22c55e',
                fontSize: '14px', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#22c55e';
                e.currentTarget.style.color = '#0b1411';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#22c55e';
              }}
            >
              Back to Login
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

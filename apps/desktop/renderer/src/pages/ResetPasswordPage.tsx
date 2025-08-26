import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { supabase } from '../lib/supabase';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  // This page only handles email requests - password reset is handled by ResetPasswordConfirmPage
  useEffect(() => {
    console.log('ResetPasswordPage - Email request mode only');
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [success, countdown]);

  // Shimmer effect for background
  useEffect(() => {
    const shimmerElements = document.querySelectorAll('.shimmer-bg');
    
    shimmerElements.forEach((el, index) => {
      const delay = index * 2; // Stagger the animations
      (el as HTMLElement).style.animationDelay = `${delay}s`;
    });
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('ResetPasswordPage - Sending reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`
      });

      if (error) {
        console.error('ResetPasswordPage - Reset email error:', error);
        setError(error.message);
      } else {
        console.log('ResetPasswordPage - Reset email sent successfully');
        setSuccess(true);
        setCountdown(30);
        setEmail(''); // Clear email field after success
      }
    } catch (error) {
      console.error('ResetPasswordPage - Unexpected error sending reset email:', error);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`
      });

      if (error) {
        setError(error.message);
      } else {
        setCountdown(30);
        setError('');
      }
    } catch (error) {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setSuccess(false);
    setError('');
    setCountdown(30);
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

      {/* Main Container - Glassmorphic design matching LoginPage */}
      <div style={{
        maxWidth: '480px', width: '100%', background: 'rgba(17, 24, 39, 0.55)',
        borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)', overflow: 'hidden', zIndex: 10, position: 'relative'
      }}>
        
        {/* Header - matching LoginPage header styling */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          color: '#e5e7eb', padding: '36px 40px', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '700', color: '#e5e7eb' }}>
            Forgot Your Password?
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, color: '#22c55e', fontWeight: '600' }}>
            Enter your email address and we'll send you a password reset link
          </p>
        </div>
        
        {/* Form Container - matching LoginPage form-container styling */}
        <div style={{ padding: '40px' }}>
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px', padding: '12px', marginBottom: '20px',
              color: '#fca5a5', fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px', padding: '20px', marginBottom: '20px',
              textAlign: 'center'
            }}>
              {/* Tick Animation */}
              <div style={{
                width: '60px', height: '60px', margin: '0 auto 16px',
                background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'tickPulse 2s ease-in-out infinite'
              }}>
                <div style={{
                  width: '24px', height: '12px', border: '3px solid #22c55e',
                  borderTop: 'none', borderRight: 'none', transform: 'rotate(-45deg)',
                  marginTop: '-2px'
                }} />
              </div>
              
              <h3 style={{ color: '#22c55e', margin: '0 0 8px 0', fontSize: '18px' }}>
                Email Sent Successfully!
              </h3>
              <p style={{ color: '#86efac', margin: '0 0 16px 0', fontSize: '14px' }}>
                Check your email and click the reset link to continue.
              </p>
              
              {/* Countdown and Resend */}
              <div style={{ marginBottom: '16px' }}>
                {countdown > 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                    Resend available in {countdown} seconds
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: '#22c55e', padding: '8px 16px', borderRadius: '6px',
                      fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? 'Sending...' : 'Resend Link'}
                  </button>
                )}
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleBackToForm}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#9ca3af', padding: '8px 16px', borderRadius: '6px',
                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  Try Different Email
                </button>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#22c55e', padding: '8px 16px', borderRadius: '6px',
                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
          
          {!success && (
            <form onSubmit={handleRequestReset}>
              
              {/* Email Field */}
              <div style={{ marginBottom: '30px' }}>
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
              
              {/* Submit Button - matching LoginPage submit-btn styling */}
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
                    Sending Reset Link...
                  </div>
                ) : 'Send Reset Link'}
              </button>
            </form>
          )}
          
          {/* Back to Login Link - only show when not in success state */}
          {!success && (
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
          )}
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
        
        @keyframes tickPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default ResetPasswordPage;

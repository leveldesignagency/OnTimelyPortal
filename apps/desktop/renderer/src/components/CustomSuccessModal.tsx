import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../ThemeContext';

interface CustomSuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoCloseMs?: number; // Optional auto-close timer
  buttonText?: string;
}

export default function CustomSuccessModal({ 
  isOpen, 
  title, 
  message, 
  onClose, 
  autoCloseMs = 3000,
  buttonText = "Continue" 
}: CustomSuccessModalProps) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [isVisible, setIsVisible] = useState(false);

  const colors = {
    cardBg: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark ? '#a1a1aa' : '#666666',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    success: '#22c55e'
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoCloseMs > 0) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseMs);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div
        style={{
          background: colors.cardBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.4)' 
            : '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)',
          transform: isVisible ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Success Circle with Checkmark */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: colors.success,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'successPulse 0.6s ease-out',
            boxShadow: `0 0 30px ${colors.success}40`
          }}
        >
          <div
            style={{
              fontSize: '40px',
              color: 'white',
              fontWeight: 'bold',
              lineHeight: 1
            }}
          >
            ✓
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '16px',
            color: colors.success,
            margin: '0 0 16px 0'
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            color: colors.textSecondary,
            marginBottom: '32px',
            fontSize: '16px',
            lineHeight: '1.5',
            margin: '0 0 32px 0'
          }}
        >
          {message}
        </p>

        {/* Continue Button */}
        <button
          onClick={onClose}
          style={{
            background: colors.success,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: `0 4px 12px ${colors.success}30`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 6px 20px ${colors.success}40`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.success}30`;
          }}
        >
          {buttonText}
        </button>
      </div>

      {/* CSS-in-JS Animation */}
      <style>{`
        @keyframes successPulse {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 
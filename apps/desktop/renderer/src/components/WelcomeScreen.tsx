import React, { useState, useEffect } from 'react';

interface WelcomeScreenProps {
  onComplete: () => void;
  isDark: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete, isDark }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps = [
    {
      title: "Welcome to Timely",
      subtitle: "Your professional event management companion",
      description: "Manage events, teams, and guests with powerful tools designed for modern event professionals.",
      icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
      color: "#22c55e"
    },
    {
      title: "Event Management",
      subtitle: "Create and organize events effortlessly",
      description: "Build comprehensive event timelines, manage guest lists, and coordinate team activities all in one place.",
      icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
      color: "#3b82f6"
    },
    {
      title: "Team Collaboration",
      subtitle: "Work together seamlessly",
      description: "Real-time chat, task assignments, and shared workspaces keep your team connected and productive.",
      icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
      color: "#8b5cf6"
    },
    {
      title: "Guest Experience",
      subtitle: "Delight your attendees",
      description: "Interactive timelines, mobile apps, and real-time updates create memorable experiences for your guests.",
      icon: "✨",
      color: "#f59e0b"
    },
    {
      title: "Ready to Begin",
      subtitle: "Your journey starts now",
      description: "Let's get you set up with your first event. You'll be managing like a pro in no time!",
      icon: "🚀",
      color: "#ec4899"
    }
  ];

  const handleSkip = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onComplete(); // Call onComplete immediately for seamless transition
    }, 400); // Shorter transition time
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - user clicked "Get Started"
      setIsTransitioning(true);
      setTimeout(() => {
        onComplete(); // Call onComplete immediately for seamless transition
      }, 400); // Shorter transition time
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      padding: '24px',
      transition: 'opacity 0.5s ease-out'
    }}>
      
      {/* Background Animation Elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 100,
        height: 100,
        background: 'rgba(34,197,94,0.1)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite',
        zIndex: -1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: 150,
        height: 150,
        background: 'rgba(59,130,246,0.1)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse',
        zIndex: -1
      }} />
      <div style={{
        position: 'absolute',
        top: '60%',
        left: '20%',
        width: 80,
        height: 80,
        background: 'rgba(139,92,246,0.1)',
        borderRadius: '50%',
        animation: 'float 7s ease-in-out infinite',
        zIndex: -1
      }} />

      {/* Main Container - Glassmorphic design matching forms.html */}
      <div style={{
        maxWidth: '880px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.55)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        zIndex: 10,
        position: 'relative',
        transform: isTransitioning ? 'scale(0.9) translateY(30px) rotateX(10deg)' : 'scale(1) translateY(0) rotateX(0deg)',
        opacity: isTransitioning ? 0 : 1,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        filter: isTransitioning ? 'blur(2px)' : 'blur(0px)'
      }}>
        
        {/* Header - matching forms.html header styling */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          color: '#e5e7eb',
          padding: '36px 40px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          
          {/* Icon Animation */}
          <div style={{
            fontSize: 80,
            marginBottom: 24,
            animation: 'bounceIn 1s ease-out',
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.3))'
          }}>
            {steps[currentStep].icon}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '10px',
            fontWeight: '700',
            color: '#e5e7eb'
          }}>
            {steps[currentStep].title}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            color: steps[currentStep].color,
            fontWeight: '600'
          }}>
            {steps[currentStep].subtitle}
          </p>
        </div>

        {/* Content Container - matching forms.html form-container styling */}
        <div style={{
          padding: '40px'
        }}>
          
          {/* Description */}
          <p style={{
            fontSize: '18px',
            lineHeight: 1.6,
            margin: '0 0 48px 0',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {steps[currentStep].description}
          </p>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: 4,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 2,
            marginBottom: 32,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${steps[currentStep].color}, ${steps[currentStep + 1]?.color || steps[currentStep].color})`,
              borderRadius: 2,
              transition: 'width 0.8s ease-out',
              boxShadow: `0 0 20px ${steps[currentStep].color}40`
            }} />
          </div>

          {/* Step Indicators */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 48
          }}>
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: index <= currentStep ? steps[currentStep].color : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  transform: index === currentStep ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: index === currentStep ? `0 0 20px ${steps[currentStep].color}60` : 'none'
                }}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            
            {/* Skip Button - matching forms.html button styling */}
            <button
              onClick={handleSkip}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e5e7eb',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              Skip Tutorial
            </button>

            {/* Next/Get Started Button - matching forms.html submit-btn styling */}
            <button
              onClick={handleNext}
              style={{
                background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                color: '#0b1411',
                padding: '14px 28px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 24px rgba(34,197,94,0.25)',
                minWidth: '160px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.filter = 'brightness(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;

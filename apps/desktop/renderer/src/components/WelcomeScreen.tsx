import React, { useState, useEffect } from 'react';

interface WelcomeScreenProps {
  onComplete: () => void;
  isDark: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete, isDark }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: "Welcome to Timely",
      subtitle: "Your professional event management companion",
      description: "Manage events, teams, and guests with powerful tools designed for modern event professionals.",
      icon: "🎯",
      color: "#22c55e"
    },
    {
      title: "Event Management",
      subtitle: "Create and organize events effortlessly",
      description: "Build comprehensive event timelines, manage guest lists, and coordinate team activities all in one place.",
      icon: "📅",
      color: "#3b82f6"
    },
    {
      title: "Team Collaboration",
      subtitle: "Work together seamlessly",
      description: "Real-time chat, task assignments, and shared workspaces keep your team connected and productive.",
      icon: "👥",
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - wait a bit then complete
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 500); // Wait for fade out animation
        }, 2000);
      }
    }, 3000); // 3 seconds per step

    return () => clearTimeout(timer);
  }, [currentStep, steps.length, onComplete]);

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 500);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
      setTimeout(onComplete, 500);
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
      
      {/* Main Container - matching forms.html styling */}
      <div style={{
        maxWidth: '880px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.55)',
        borderRadius: '18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden'
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
            fontWeight: 700,
            color: '#e5e7eb'
          }}>
            {steps[currentStep].title}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            color: steps[currentStep].color,
            fontWeight: 600
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

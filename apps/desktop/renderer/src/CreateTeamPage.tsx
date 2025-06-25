import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, User, getCompanyUsers, getCompanyEvents, Event } from './lib/auth';
import { createTeam, getCompanyTeams, Team } from './lib/chat';
import { assignTeamToEvent } from './lib/supabase';

interface CreateTeamStep1Data {
  teamName: string;
  description: string;
}

interface CreateTeamStep2Data {
  selectedMembers: string[];
}

interface CreateTeamStep3Data {
  selectedEventId: string;
}

// Add utility function for team initials
const getTeamInitials = (team: any): string => {
  // If avatar is already short initials (2-3 characters), use it
  if (team.avatar && team.avatar.length <= 3 && !team.avatar.includes('http') && !team.avatar.includes('.')) {
    return team.avatar;
  }
  
  // Otherwise, generate initials from team name
  return team.name
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

const CreateTeamPage: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  
  // Main page state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<CreateTeamStep1Data>({ teamName: '', description: '' });
  const [step2Data, setStep2Data] = useState<CreateTeamStep2Data>({ selectedMembers: [] });
  const [step3Data, setStep3Data] = useState<CreateTeamStep3Data>({ selectedEventId: '' });
  
  // General state
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      
      // Load existing teams
      const teams = await getCompanyTeams(user.company_id);
      setExistingTeams(teams);
      
      // Load users for step 2
      const users = await getCompanyUsers(user.company_id);
      setAvailableUsers(users.filter(u => u.id !== user.id));
      
      // Load events for step 3
      const events = await getCompanyEvents(user.company_id);
      setAvailableEvents(events || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setStep1Data({ teamName: '', description: '' });
    setStep2Data({ selectedMembers: [] });
    setStep3Data({ selectedEventId: '' });
    setError('');
    setSearchTerm('');
  };

  const handleCreateNewTeam = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    resetForm();
  };

  const handleStep1Submit = () => {
    if (!step1Data.teamName.trim()) {
      setError('Team name is required');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleStep2Submit = () => {
    setError('');
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!currentUser || !step3Data.selectedEventId) {
      setError('Please select an event');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the team
      const team = await createTeam(
        currentUser.id,
        currentUser.company_id,
        step1Data.teamName.trim(),
        step1Data.description.trim() || undefined,
        step2Data.selectedMembers
      );

      if (team) {
        // Assign team to event
        await assignTeamToEvent(team.id, step3Data.selectedEventId, currentUser.id);
        
        // Refresh the teams list
        await loadInitialData();
        
        // Close the form
        setShowCreateForm(false);
        resetForm();
      } else {
        setError('Failed to create team');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      setError(error instanceof Error ? error.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setStep2Data(prev => ({
      selectedMembers: prev.selectedMembers.includes(userId) 
        ? prev.selectedMembers.filter(id => id !== userId)
        : [...prev.selectedMembers, userId]
    }));
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Styles
  const containerStyle: React.CSSProperties = {
    height: '100vh',
    background: isDark ? '#0f0f0f' : '#f8f9fa',
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle: React.CSSProperties = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  };

  const buttonStyle: React.CSSProperties = {
    background: '#228B22',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: isDark ? '#adb5bd' : '#6c757d',
    border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '12px',
    transition: 'all 0.2s ease'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
    borderRadius: '8px',
    background: isDark ? '#2a2a2a' : '#ffffff',
    color: isDark ? '#ffffff' : '#1a1a1a',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const teamCardStyle: React.CSSProperties = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    border: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative'
  };

  // Render existing teams list
  const renderTeamsList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Company Teams ({existingTeams.length})
        </h2>
        <button onClick={handleCreateNewTeam} style={buttonStyle}>
          + Create New Team
        </button>
      </div>

      {existingTeams.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: isDark ? '#adb5bd' : '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No teams yet</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Create your first team to get started with collaboration</p>
        </div>
      ) : (
        <div>
          {existingTeams.map(team => (
            <div
              key={team.id}
              style={teamCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(255, 255, 255, 0.1)' : '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#228B22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginRight: '16px'
                }}>
                  {getTeamInitials(team)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isDark ? '#ffffff' : '#1a1a1a'
                  }}>
                    {team.name}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: isDark ? '#adb5bd' : '#6c757d'
                  }}>
                    {team.description || 'No description'}
                  </p>
                </div>
                <div style={{
                  background: isDark ? '#2a2a2a' : '#f8f9fa',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: isDark ? '#adb5bd' : '#6c757d'
                }}>
                  {team.member_count || 0} members
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render form steps (existing code with minor adjustments)
  const renderStep1 = () => (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h3 style={{
        margin: '0 0 24px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: isDark ? '#ffffff' : '#1a1a1a'
      }}>
        Team Details
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Team Name *
        </label>
        <input
          type="text"
          value={step1Data.teamName}
          onChange={(e) => setStep1Data(prev => ({ ...prev, teamName: e.target.value }))}
          placeholder="Enter team name..."
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Description (Optional)
        </label>
        <textarea
          value={step1Data.description}
          onChange={(e) => setStep1Data(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the team's purpose..."
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '80px'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleStep1Submit} style={buttonStyle}>
          Next: Add Members
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h3 style={{
        margin: '0 0 24px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: isDark ? '#ffffff' : '#1a1a1a'
      }}>
        Add Team Members
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          style={inputStyle}
        />
      </div>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        {filteredUsers.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            {searchTerm ? 'No users found matching your search' : 'No users available'}
          </div>
        ) : (
          filteredUsers.map(user => (
            <div
              key={user.id}
              onClick={() => toggleMember(user.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f8f9fa'}`,
                cursor: 'pointer',
                background: step2Data.selectedMembers.includes(user.id) ? (isDark ? '#2a2a2a' : '#f0f8f0') : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#228B22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                marginRight: '12px'
              }}>
                {user.avatar && user.avatar.length <= 3 ? user.avatar : user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isDark ? '#ffffff' : '#1a1a1a',
                  marginBottom: '2px'
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#adb5bd' : '#6c757d'
                }}>
                  {user.email}
                </div>
              </div>
              {step2Data.selectedMembers.includes(user.id) && (
                <div style={{ color: '#228B22', fontSize: '16px' }}>✓</div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{
        background: isDark ? '#2a2a2a' : '#f8f9fa',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        color: isDark ? '#adb5bd' : '#6c757d'
      }}>
        {step2Data.selectedMembers.length} member{step2Data.selectedMembers.length !== 1 ? 's' : ''} selected
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentStep(1)} style={secondaryButtonStyle}>
          Back
        </button>
        <button onClick={handleStep2Submit} style={buttonStyle}>
          Next: Attach to Event
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h3 style={{
        margin: '0 0 24px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: isDark ? '#ffffff' : '#1a1a1a'
      }}>
        Attach to Event
      </h3>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        {availableEvents.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            No events available
          </div>
        ) : (
          availableEvents.map(event => (
            <div
              key={event.id}
              onClick={() => setStep3Data({ selectedEventId: event.id })}
              style={{
                padding: '16px',
                borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f8f9fa'}`,
                cursor: 'pointer',
                background: step3Data.selectedEventId === event.id ? (isDark ? '#2a2a2a' : '#f0f8f0') : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDark ? '#ffffff' : '#1a1a1a'
                }}>
                  {event.name}
                </h4>
                {step3Data.selectedEventId === event.id && (
                  <div style={{ color: '#228B22', fontSize: '16px' }}>✓</div>
                )}
              </div>
              <div style={{
                fontSize: '14px',
                color: isDark ? '#adb5bd' : '#6c757d',
                marginBottom: '4px'
              }}>
                {new Date(event.from).toLocaleDateString()} - {new Date(event.to).toLocaleDateString()}
              </div>
              {event.location && (
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#adb5bd' : '#6c757d'
                }}>
                  📍 {event.location}
                </div>
              )}
              {event.description && (
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#adb5bd' : '#6c757d',
                  marginTop: '8px'
                }}>
                  {event.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentStep(2)} style={secondaryButtonStyle}>
          Back
        </button>
        <button 
          onClick={handleFinalSubmit}
          disabled={loading || !step3Data.selectedEventId}
          style={{
            ...buttonStyle,
            opacity: (loading || !step3Data.selectedEventId) ? 0.5 : 1
          }}
        >
          {loading ? 'Creating Team...' : 'Create Team'}
        </button>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Close button */}
        <button
          onClick={handleCancelCreate}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            Create New Team
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            Step {currentStep} of 3
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '32px',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 1 ? '#228B22' : (isDark ? '#404040' : '#dee2e6'),
            color: currentStep >= 1 ? '#ffffff' : (isDark ? '#adb5bd' : '#6c757d'),
            fontSize: '14px',
            fontWeight: '600'
          }}>1</div>
          <div style={{ width: '40px', height: '2px', background: currentStep > 1 ? '#228B22' : (isDark ? '#404040' : '#dee2e6') }} />
          
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 2 ? '#228B22' : (isDark ? '#404040' : '#dee2e6'),
            color: currentStep >= 2 ? '#ffffff' : (isDark ? '#adb5bd' : '#6c757d'),
            fontSize: '14px',
            fontWeight: '600'
          }}>2</div>
          <div style={{ width: '40px', height: '2px', background: currentStep > 2 ? '#228B22' : (isDark ? '#404040' : '#dee2e6') }} />
          
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 3 ? '#228B22' : (isDark ? '#404040' : '#dee2e6'),
            color: currentStep >= 3 ? '#ffffff' : (isDark ? '#adb5bd' : '#6c757d'),
            fontSize: '14px',
            fontWeight: '600'
          }}>3</div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            Teams Management
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            Manage your company teams and collaboration
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {renderTeamsList()}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && renderCreateForm()}
    </div>
  );
};

export default CreateTeamPage; 
 
 
 
 
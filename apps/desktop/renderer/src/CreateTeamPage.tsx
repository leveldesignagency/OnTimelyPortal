import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, User, getCompanyUsers, getCompanyEvents, Event } from './lib/auth';
import { createTeam, getCompanyTeams, Team } from './lib/chat';
import { assignTeamToEvent } from './lib/supabase';
import { supabase } from './lib/supabase';
import { createTeamChat } from './lib/chat'; // Added missing import
import CustomSuccessModal from './components/CustomSuccessModal';

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

// Utility function for team initials
const getTeamInitials = (team: any): string => {
  if (team.avatar && team.avatar.length <= 3 && !team.avatar.includes('http') && !team.avatar.includes('.')) {
    return team.avatar;
  }
  
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
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressMessage, setProgressMessage] = useState({ title: '', message: '' });
  
  // Team menu state
  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuTeamId(null);
    };

    if (openMenuTeamId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuTeamId]);

  useEffect(() => {
    async function testCompanyId() {
      const { data, error } = await supabase.rpc('current_user_company_id');
      console.log('Current user company_id (test):', data, error);
    }
    testCompanyId();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      console.log('Auth UID test:', data?.user?.id, error);
    });
  }, []);

  const loadInitialData = async () => {
    setError('');
    setLoading(true);
    try {
      console.log('🔄 Starting loadInitialData...');
      const user = await getCurrentUser();
      console.log('👤 Current user:', user);
      if (!user) {
        console.error('❌ No current user found, redirecting to login');
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      
      // Load existing teams
      console.log('🔄 Loading existing teams for company:', user.company_id);
      const teams = await getCompanyTeams(user.company_id);
      console.log('✅ Loaded teams:', teams);
      setExistingTeams(teams || []);
      
      // Load users for step 2 - ensure we get all company users except self
      console.log('🔄 Loading company users for company:', user.company_id);
      const users = await getCompanyUsers(user.company_id);
      console.log('✅ Raw users from database:', users);
      if (!users || users.length === 0) {
        console.warn('⚠️ No users found for company');
        setAvailableUsers([]);
      } else {
        setAvailableUsers(users); // Show all users, filter in UI
        console.log('✅ Available users set:', users.length, 'users');
      }
      
      // Load events for step 3
      console.log('🔄 Loading company events for company:', user.company_id);
      const events = await getCompanyEvents(user.company_id);
      console.log('✅ Loaded events:', events);
      setAvailableEvents(events || []);
      
      console.log('✅ loadInitialData completed successfully');
    } catch (error) {
      console.error('💥 Failed to load data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      setError(errorMessage);
      alert('Error loading data: ' + errorMessage);
    } finally {
      setLoading(false);
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
    console.log('🚀 Starting team creation process...');
    
    if (!currentUser) {
      const errorMsg = 'No current user found';
      console.error('❌', errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!step3Data.selectedEventId) {
      const errorMsg = 'Please select an event';
      console.error('❌', errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Use the current user from our auth system (from users table)
      console.log('👤 Using current user as creator:', currentUser.id);
      console.log('📧 Current user email:', currentUser.email);
      
      // 2. Show "Creating team..." progress
      const uniqueMemberIds = Array.from(new Set([currentUser.id, ...step2Data.selectedMembers]));
      setProgressMessage({
        title: 'Creating Team...',
        message: `Setting up "${step1Data.teamName.trim()}" with ${uniqueMemberIds.length} member${uniqueMemberIds.length !== 1 ? 's' : ''}...`
      });
      setShowProgressModal(true);
      
      // 3. Create the team with all selected members (excluding duplicates)
      console.log('👥 Creating team with members:', uniqueMemberIds);
      console.log('📝 Team details:', {
        name: step1Data.teamName.trim(),
        description: step1Data.description.trim(),
        creatorId: currentUser.id,
        companyId: currentUser.company_id
      });
      
      const team = await createTeam(
        currentUser.id, // Use currentUser.id from users table
        currentUser.company_id,
        step1Data.teamName.trim(),
        step1Data.description.trim() || undefined,
        uniqueMemberIds // All members including creator
      );
      
      console.log('✅ Team creation result:', team);
      
      if (!team || !team.id) {
        throw new Error('Failed to create team - no team data returned');
      }
      
      // 4. Update progress ONLY after team creation succeeds
      setProgressMessage({
        title: 'Team Created!',
        message: 'Linking team to event and setting up collaboration...'
      });
      
      // 5. Link the team to the selected event
      console.log('🔗 Linking team to event:', team.id, '→', step3Data.selectedEventId);
      await assignTeamToEvent(team.id, step3Data.selectedEventId, currentUser.id);
      console.log('✅ Team linked to event successfully');
      
      // 6. Update progress ONLY after event linking succeeds
      setProgressMessage({
        title: 'Setting Up Team Chat...',
        message: 'Creating secure chat room for team collaboration...'
      });
      
      // 7. Create a chat group for the team (optional - don't fail if this fails)
      console.log('💬 Creating team chat...');
      try {
        const chatResult = await createTeamChat(
          currentUser.id,
          currentUser.company_id,
          team.id,
          step1Data.teamName.trim() + ' Team Chat'
        );
        console.log('✅ Team chat creation result:', chatResult);
      } catch (chatError) {
        console.warn('⚠️ Team chat creation failed, but team creation succeeded:', chatError);
        // Don't throw - let team creation succeed even if chat fails
      }
      
      // 8. Hide progress modal and close create form
      setShowProgressModal(false);
      setShowCreateForm(false);
      resetForm();
      
      // 9. Refresh the teams list so the new team appears
      console.log('🔄 Refreshing teams list...');
      await loadInitialData();
      
      // 10. Show final success modal after a brief moment
      setTimeout(() => {
        setSuccessMessage({
          title: 'Team Created Successfully!',
          message: `"${step1Data.teamName.trim()}" has been created with ${uniqueMemberIds.length} member${uniqueMemberIds.length !== 1 ? 's' : ''} and linked to the event. Team chat is ready for collaboration!`
        });
        setShowSuccessModal(true);
      }, 300);
      
      console.log('🎉 Team creation process completed successfully!');
    } catch (error) {
      console.error('💥 Failed to create team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      
      // Hide progress modal on error
      setShowProgressModal(false);
      
      setError(errorMessage);
      alert('Error creating team: ' + errorMessage);
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

  const handleDeleteTeam = async (team: Team) => {
    if (!currentUser) {
      setError('Authentication error: Please log in again');
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Deleting team:', team.name, team.id);

      // Delete from Supabase - this will cascade delete team_members, team_events, etc.
      console.log('🗑️ Attempting to delete team from database:', {
        teamId: team.id,
        teamName: team.name,
        companyId: currentUser.company_id,
        currentUserId: currentUser.id
      });

      const { data, error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id)
        .eq('company_id', currentUser.company_id) // Ensure company isolation
        .select(); // Return the deleted record to confirm deletion

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('❌ Failed to delete team from database:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No team was deleted - team not found or permission denied');
        throw new Error('Team not found or you do not have permission to delete this team');
      }

      console.log('✅ Team deleted successfully');

      // Update local state
      setExistingTeams(prev => prev.filter(t => t.id !== team.id));
      
      // Close modals
      setShowDeleteConfirm(false);
      setTeamToDelete(null);
      setOpenMenuTeamId(null);

      // Show success message
      setSuccessMessage({
        title: 'Team Deleted',
        message: `"${team.name}" has been deleted successfully. All team data and chat history have been removed.`
      });
      setShowSuccessModal(true);

    } catch (error) {
      console.error('💥 Failed to delete team:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setShowDeleteConfirm(true);
    setOpenMenuTeamId(null);
  };

  const filteredUsers = availableUsers
    .filter(user => user.id !== currentUser?.id) // Exclude self here
    .filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Show all users if no search term, or filtered users if searching
  const displayUsers = searchTerm.trim() === '' ? availableUsers : filteredUsers;

  // Styles based on calendar page
  const colors = {
    bg: isDark ? '#0f0f0f' : '#f8f9fa',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark ? '#adb5bd' : '#6c757d',
    border: isDark ? '#404040' : '#dee2e6',
    hover: isDark ? '#2a2a2a' : '#ffffff',
    inputBg: isDark ? '#2a2a2a' : '#ffffff'
  };

  const glassStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.05)'
  };

  const containerStyle: React.CSSProperties = {
    background: colors.bg,
    minHeight: '100vh',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const buttonStyle: React.CSSProperties = {
    ...glassStyle,
    padding: '12px 16px',
    border: '1.5px solid rgba(255, 255, 255, 0.8)',
    color: colors.text,
    fontSize: '14px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '140px',
    height: '44px',
    whiteSpace: 'nowrap'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    background: colors.hover,
    color: colors.text,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginRight: '12px',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)'
  };

  // 1. Update inputStyle to add inner shadow and ensure 100% width
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    background: colors.inputBg,
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backdropFilter: 'blur(10px)',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.18)', // inner shadow
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(10px)'
  };

  const modalContentStyle: React.CSSProperties = {
    background: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(20px)'
  };

  // 1. Define a shared stepContainerStyle for all steps
  const stepContainerStyle: React.CSSProperties = {
    maxWidth: '500px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center',
  };

  // Render existing teams list
  const renderTeamsList = () => (
    <div>
      {error && (
        <div style={{ 
          color: '#ef4444', 
          backgroundColor: isDark ? '#2d1b1b' : '#fef2f2',
          border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          fontWeight: '500'
        }}>
          ⚠️ Error: {error}
        </div>
      )}
      
      {loading && (
        <div style={{ 
          color: isDark ? '#94a3b8' : '#64748b',
          padding: '16px',
          textAlign: 'center'
        }}>
          Loading teams...
        </div>
      )}
      
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          margin: 0,
          padding: '0 0 30px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: colors.text
        }}>
                      Company Workspace ({existingTeams.length})
        </h2>
      </div>

      {existingTeams.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: colors.textSecondary
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            fontWeight: '300'
                      }}>Workspace</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: colors.text }}>No teams yet</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Create your first team to get started with collaboration</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          width: '100%',
          padding: '0 40px'
        }}>
          {existingTeams.map(team => (
            <div
              key={team.id}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '38px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '1.5px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '35px',
                boxShadow: isDark 
                  ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1), 0 0 30px rgba(255, 255, 255, 0.3)' 
                  : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.9), 0 0 30px rgba(255, 255, 255, 0.6)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 30px rgba(255, 255, 255, 0.2)' 
                  : '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 30px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.1)' 
                  : '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {/* 3-dot menu positioned at bottom right */}
              <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}></div>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}></div>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}></div>
                  </div>
                </button>
                
                {/* Dropdown menu */}
                {openMenuTeamId === team.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '4px',
                    background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    boxShadow: isDark 
                      ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
                      : '0 8px 24px rgba(0, 0, 0, 0.15)',
                    backdropFilter: 'blur(16px)',
                    zIndex: 1000,
                    minWidth: '120px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(team);
                      }}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Team Name - Largest Text */}
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: colors.text,
                lineHeight: '1.1',
                textAlign: 'left'
              }}>
                {team.name}
              </h3>

              {/* Description - Same size as member details */}
              <p style={{
                margin: '0 0 80px 0',
                fontSize: '14px',
                color: colors.textSecondary,
                lineHeight: '1.5',
                textAlign: 'left'
              }}>
                {team.description || 'No description'}
              </p>

              {/* Team Members Section */}
              <div style={{ flex: 1, marginBottom: '60px' }}>
                <h4 style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.text,
                  textAlign: 'left'
                }}>
                  Team Members
                </h4>
                
                <div>
                  {team.members && team.members.length > 0 ? (
                    team.members.slice(0, 4).map((member: any, index: number) => (
                      <div key={member.id || index} style={{
                        fontSize: '14px',
                        color: colors.textSecondary,
                        marginBottom: '12px',
                        textAlign: 'left',
                        lineHeight: '1.4'
                      }}>
                        {member.user?.name || member.name || 'Unknown'}
                      </div>
                    ))
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: colors.textSecondary,
                      fontStyle: 'italic',
                      textAlign: 'left'
                    }}>
                      No members yet
                    </div>
                  )}
                  
                  {team.members && team.members.length > 4 && (
                    <div style={{
                      fontSize: '13px',
                      color: colors.textSecondary,
                      marginTop: '8px',
                      fontStyle: 'italic',
                      textAlign: 'left'
                    }}>
                      +{team.members.length - 4} more members
                    </div>
                  )}
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
    <div style={stepContainerStyle}>
      <h3 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: colors.text,
        alignSelf: 'flex-start',
      }}>
        Team Details
      </h3>
      
      <div style={{ width: '100%' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: colors.text,
        }}>
          Team Name *
        </label>
        <input
          type="text"
          value={step1Data.teamName}
          onChange={e => setStep1Data({ ...step1Data, teamName: e.target.value })}
          placeholder="Enter team name..."
          style={inputStyle}
        />
      </div>

      <div style={{ width: '100%' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: colors.text,
        }}>
          Description (Optional)
        </label>
        <textarea
          value={step1Data.description}
          onChange={e => setStep1Data({ ...step1Data, description: e.target.value })}
          placeholder="Additional Information..."
          style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', width: '100%', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={handleStep1Submit} style={{ ...buttonStyle, width: '100%' }}>Next</button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={stepContainerStyle}>
      <h3 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: colors.text,
        alignSelf: 'flex-start',
      }}>
        Add Team Members
      </h3>

      <div style={{ width: '100%' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search users by name or email..."
          style={inputStyle}
        />
        {searchTerm && (
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary,
            marginTop: '4px',
          }}>
            {displayUsers.length} user{displayUsers.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {searchTerm.trim() !== '' && (
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          marginBottom: '0',
          width: '100%',
          background: colors.inputBg,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        }}>
          {displayUsers.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: colors.textSecondary,
            }}>
              No users found
            </div>
          ) : (
            displayUsers.map(user => (
              <div
                key={user.id}
                onClick={() => toggleMember(user.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  background: step2Data.selectedMembers.includes(user.id) ? colors.hover : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.hover,
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.text,
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
                    color: colors.text,
                    marginBottom: '2px'
                  }}>
                    {user.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.textSecondary
                  }}>
                    {user.email}
                  </div>
                </div>
                {step2Data.selectedMembers.includes(user.id) && (
                  <div style={{ 
                    color: colors.text, 
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>✓</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div style={{
        background: colors.hover,
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        color: colors.textSecondary,
        width: '100%',
      }}>
        {step2Data.selectedMembers.length} member{step2Data.selectedMembers.length !== 1 ? 's' : ''} selected
      </div>

      <div style={{ display: 'flex', width: '100%', gap: '12px', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentStep(1)} style={{ ...secondaryButtonStyle, width: '100%' }}>Back</button>
        <button onClick={handleStep2Submit} style={{ ...buttonStyle, width: '100%' }}>Next</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={stepContainerStyle}>
      <h3 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: colors.text,
        alignSelf: 'flex-start',
      }}>
        Attach to Event
      </h3>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        marginBottom: '0',
        width: '100%',
      }}>
        {availableEvents.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: colors.textSecondary,
          }}>
            No events available
          </div>
        ) : (
          availableEvents.map(event => (
            <div
              key={event.id}
              onClick={() => setStep3Data({ selectedEventId: step3Data.selectedEventId === event.id ? '' : event.id })}
              style={{
                padding: '16px',
                borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer',
                background: step3Data.selectedEventId === event.id ? colors.hover : 'transparent',
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
                  color: colors.text
                }}>
                  {event.name}
                </h4>
                {step3Data.selectedEventId === event.id && (
                  <div style={{ 
                    color: colors.text, 
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>✓</div>
                )}
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.textSecondary,
                marginBottom: '4px'
              }}>
                {new Date(event.from).toLocaleDateString()} - {new Date(event.to).toLocaleDateString()}
              </div>
              {event.location && (
                <div style={{
                  fontSize: '12px',
                  color: colors.textSecondary
                }}>
                  {event.location}
                </div>
              )}
              {event.description && (
                <div style={{
                  fontSize: '12px',
                  color: colors.textSecondary,
                  marginTop: '8px'
                }}>
                  {event.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', width: '100%', gap: '12px', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentStep(2)} style={{ ...secondaryButtonStyle, width: '100%' }}>Back</button>
        <button onClick={handleFinalSubmit} style={{ ...buttonStyle, width: '100%' }} disabled={loading || !step3Data.selectedEventId}>
          {loading ? 'Creating Team...' : 'Next'}
        </button>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {error && (
          <div style={{ 
            color: '#ef4444', 
            backgroundColor: isDark ? '#2d1b1b' : '#fef2f2',
            border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {/* Close button */}
        <button
          onClick={handleCancelCreate}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '28px',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            boxShadow: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = colors.text; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.textSecondary; }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: colors.text
          }}>
            Create New Team
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: colors.textSecondary
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
            background: currentStep >= 1 ? '#ffffff' : colors.hover,
            color: currentStep >= 1 ? '#000000' : colors.textSecondary,
            fontSize: '14px',
            fontWeight: '600',
            border: `1px solid ${colors.border}`
          }}>1</div>
          <div style={{ width: '40px', height: '2px', background: currentStep > 1 ? '#ffffff' : colors.border }} />
          
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 2 ? '#ffffff' : colors.hover,
            color: currentStep >= 2 ? '#000000' : colors.textSecondary,
            fontSize: '14px',
            fontWeight: '600',
            border: `1px solid ${colors.border}`
          }}>2</div>
          <div style={{ width: '40px', height: '2px', background: currentStep > 2 ? '#ffffff' : colors.border }} />
          
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStep >= 3 ? '#ffffff' : colors.hover,
            color: currentStep >= 3 ? '#000000' : colors.textSecondary,
            fontSize: '14px',
            fontWeight: '600',
            border: `1px solid ${colors.border}`
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
      {/* CSS Animation for progress spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Header - Calendar page style */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            margin: '0 40px 0 0', 
            color: colors.text,
            minWidth: 'fit-content'
          }}>
            Workspace Management
          </h1>
          
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary,
            lineHeight: '1.5'
          }}>
            Create Your Team
          </div>
        </div>
        
        <button
          onClick={handleCreateNewTeam}
          disabled={loading}
          style={{
            ...buttonStyle,
            marginLeft: '20px',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 8px 25px rgba(255, 255, 255, 0.15), 0 4px 12px rgba(255, 255, 255, 0.1)' 
                : '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </div>

      {/* Content */}
      {renderTeamsList()}

      {/* Create Form Modal */}
      {showCreateForm && renderCreateForm()}
      
      {/* Progress Modal */}
      {showProgressModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500
        }}>
          <div style={{
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            backdropFilter: 'blur(16px)',
            boxShadow: isDark 
              ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.2)' 
              : '0 24px 48px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Loading spinner */}
            <div style={{
              width: '48px',
              height: '48px',
              border: `4px solid ${isDark ? '#404040' : '#e0e0e0'}`,
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px'
            }} />
            
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: colors.text
            }}>
              {progressMessage.title}
            </h2>
            
            <p style={{
              margin: '0',
              fontSize: '16px',
              color: colors.textSecondary,
              lineHeight: '1.5'
            }}>
              {progressMessage.message}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && teamToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            backdropFilter: 'blur(16px)',
            boxShadow: isDark 
              ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.2)' 
              : '0 24px 48px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Warning icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: colors.text
            }}>
              Delete Team
            </h2>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: colors.textSecondary,
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete <strong>"{teamToDelete.name}"</strong>? This action cannot be undone and will remove all team data, chat history, and event associations.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTeamToDelete(null);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleDeleteTeam(teamToDelete)}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                  }
                }}
              >
                {loading ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <CustomSuccessModal
        isOpen={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setShowSuccessModal(false)}
        autoCloseMs={0} // Don't auto-close, let user click
        buttonText="Awesome!"
      />
    </div>
  );
};

export default CreateTeamPage; 
 
 
 
 
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, User } from './lib/auth';
import { 
  getUserPendingInvitations, 
  acceptTeamInvitation, 
  declineTeamInvitation, 
  TeamInvitation 
} from './lib/chat';

const CustomErrorModal = ({ message, onClose }: { message: string; onClose: () => void; }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <div style={{ 
        background: isDark ? '#1e1e1e' : 'white', 
        padding: '32px', 
        borderRadius: '12px', 
        width: '400px', 
        textAlign: 'center', 
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
        border: isDark ? '1px solid #333' : 'none'
      }}>
        <p style={{ margin: '0 0 24px', fontSize: '18px', color: isDark ? '#ffffff' : '#000' }}>{message}</p>
        <button onClick={onClose} style={{ 
          background: isDark ? '#ffffff' : '#000', 
          color: isDark ? '#000' : '#fff', 
          border: 'none', 
          padding: '12px 48px', 
          borderRadius: '8px', 
          cursor: 'pointer', 
          fontWeight: 600, 
          fontSize: '16px' 
        }}>
          OK
        </button>
      </div>
    </div>
  );
};

const CustomSuccessModal = ({ message, onClose }: { message: string; onClose: () => void; }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <div style={{ 
        background: isDark ? '#1e1e1e' : 'white', 
        padding: '32px', 
        borderRadius: '12px', 
        width: '400px', 
        textAlign: 'center', 
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
        border: isDark ? '1px solid #333' : 'none'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <p style={{ margin: '0 0 24px', fontSize: '18px', color: isDark ? '#ffffff' : '#000' }}>{message}</p>
        <button onClick={onClose} style={{ 
          background: '#28a745', 
          color: '#fff', 
          border: 'none', 
          padding: '12px 48px', 
          borderRadius: '8px', 
          cursor: 'pointer', 
          fontWeight: 600, 
          fontSize: '16px' 
        }}>
          OK
        </button>
      </div>
    </div>
  );
};

export default function TeamInvitationsPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadUserAndInvitations = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);
        // Load pending invitations
        const pendingInvitations = await getUserPendingInvitations(currentUser.email);
        setInvitations(pendingInvitations);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        setErrorMessage('Failed to load invitations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadUserAndInvitations();
  }, [navigate]);

  const handleAcceptInvitation = async (invitation: TeamInvitation) => {
    if (!user) return;
    
    setProcessingInvitation(invitation.id);
    try {
      const success = await acceptTeamInvitation(invitation.invitation_token, user.id);
      
      if (success) {
        setSuccessMessage(`Successfully joined ${invitation.team?.name}!`);
        // Remove the accepted invitation from the list
        setInvitations(invitations.filter(inv => inv.id !== invitation.id));
      } else {
        setErrorMessage('Failed to accept invitation. Please try again.');
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      setErrorMessage('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitation: TeamInvitation) => {
    setProcessingInvitation(invitation.id);
    try {
      const success = await declineTeamInvitation(invitation.id);
      
      if (success) {
        setSuccessMessage(`Declined invitation to ${invitation.team?.name}.`);
        // Remove the declined invitation from the list
        setInvitations(invitations.filter(inv => inv.id !== invitation.id));
      } else {
        setErrorMessage('Failed to decline invitation. Please try again.');
      }
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      setErrorMessage('Failed to decline invitation. Please try again.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div style={{ 
        background: isDark ? '#121212' : '#f7f8fa', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          fontSize: '18px', 
          color: isDark ? '#ffffff' : '#000',
          textAlign: 'center'
        }}>
          Loading invitations...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: isDark ? '#121212' : '#f7f8fa', minHeight: '100vh', padding: '40px 20px' }}>
      {errorMessage && <CustomErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />}
      {successMessage && <CustomSuccessModal message={successMessage} onClose={() => setSuccessMessage('')} />}
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <button
            onClick={() => navigate('/teams/chat')}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#ffffff' : '#000',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Teams
          </button>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 600, 
            margin: '0 0 8px 0', 
            color: isDark ? '#ffffff' : '#000' 
          }}>
            Team Invitations
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: isDark ? '#aaa' : '#6b7280',
            margin: 0
          }}>
            Manage your pending team invitations
          </p>
        </div>

        {/* Invitations List */}
        {invitations.length === 0 ? (
          <div style={{
            background: isDark ? '#1e1e1e' : '#fff',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.3)' : '0 4px 32px #0002',
            border: isDark ? '1px solid #333' : 'none'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📬</div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 600, 
              margin: '0 0 12px 0', 
              color: isDark ? '#ffffff' : '#000' 
            }}>
              No pending invitations
            </h2>
            <p style={{ 
              fontSize: '16px', 
              color: isDark ? '#aaa' : '#6b7280',
              margin: '0 0 30px 0'
            }}>
              You don't have any pending team invitations at the moment.
            </p>
            <button
              onClick={() => navigate('/teams/chat')}
              style={{
                background: isDark ? '#ffffff' : '#000',
                color: isDark ? '#000' : '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              Go to Teams
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {invitations.map(invitation => (
              <div
                key={invitation.id}
                style={{
                  background: isDark ? '#1e1e1e' : '#fff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.3)' : '0 4px 32px #0002',
                  border: isDark ? '1px solid #333' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ 
                      fontSize: '20px', 
                      fontWeight: 600, 
                      margin: '0 0 8px 0', 
                      color: isDark ? '#ffffff' : '#000' 
                    }}>
                      {invitation.team?.name}
                    </h3>
                    <p style={{ 
                      fontSize: '14px', 
                      color: isDark ? '#aaa' : '#6b7280',
                      margin: '0 0 4px 0'
                    }}>
                      Invited by {invitation.invited_by_user?.name}
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      color: isDark ? '#aaa' : '#6b7280',
                      margin: 0
                    }}>
                      Role: <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{invitation.role}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#666' : '#999',
                      margin: '0 0 4px 0'
                    }}>
                      Invited: {formatDate(invitation.created_at)}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#666' : '#999',
                      margin: 0
                    }}>
                      Expires: {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDeclineInvitation(invitation)}
                    disabled={processingInvitation === invitation.id}
                    style={{
                      background: isDark ? '#444' : '#e5e7eb',
                      color: isDark ? '#ffffff' : '#374151',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: processingInvitation === invitation.id ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      opacity: processingInvitation === invitation.id ? 0.6 : 1
                    }}
                  >
                    {processingInvitation === invitation.id ? 'Processing...' : 'Decline'}
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(invitation)}
                    disabled={processingInvitation === invitation.id}
                    style={{
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: processingInvitation === invitation.id ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      opacity: processingInvitation === invitation.id ? 0.6 : 1
                    }}
                  >
                    {processingInvitation === invitation.id ? 'Processing...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
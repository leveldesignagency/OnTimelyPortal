import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, getCompanyUsers, User } from './lib/auth';
import { getCompanyTeams, createTeamChat, Team } from './lib/chat';

interface TeamWithDetails extends Team {
  members?: User[];
  member_count: number;
}

const TeamsListPage: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      const companyTeams = await getCompanyTeams(user.company_id);
      
      // Convert to our local format with proper member details
      const teamsWithDetails: TeamWithDetails[] = companyTeams.map(team => ({
        ...team,
        members: team.members?.map(member => ({
          id: member.user?.id || member.user_id,
          name: member.user?.name || 'Unknown',
          email: member.user?.email || '',
          avatar: member.user?.avatar || member.user?.name?.charAt(0) || 'U',
          status: member.user?.status as any || 'offline',
          lastSeen: member.user?.last_seen
        })).filter(Boolean) || [],
        member_count: team.member_count || 0
      }));
      
      setTeams(teamsWithDetails);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamChat = async (team: TeamWithDetails) => {
    if (!currentUser) return;

    try {
      const chat = await createTeamChat(
        currentUser.id,
        currentUser.company_id,
        team.id,
        `${team.name} Chat`
      );

      if (chat) {
        // Navigate to the chat page
        navigate('/teams/chat');
      }
    } catch (error) {
      console.error('Failed to create team chat:', error);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: isDark ? '#0f0f0f' : '#f8f9fa',
        color: isDark ? '#ffffff' : '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>Loading teams...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      background: isDark ? '#0f0f0f' : '#f8f9fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: isDark ? '#1a1a1a' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            Teams
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            Manage your teams and create team chats
          </p>
        </div>
        <button
          onClick={() => navigate('/teams/create')}
          style={{
            background: '#228B22',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          Create Team
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="search"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: '12px',
              border: 'none',
              background: isDark ? '#2a2a2a' : '#f8f9fa',
              color: isDark ? '#ffffff' : '#1a1a1a',
              outline: 'none',
              fontSize: '15px',
              boxShadow: isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: isDark ? '#adb5bd' : '#6c757d',
            fontSize: '16px'
          }}>
            🔍
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div style={{
        flex: 1,
        padding: '0 24px 24px',
        overflowY: 'auto'
      }}>
        {filteredTeams.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            {teams.length === 0 ? (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No teams yet</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '14px' }}>Create your first team to get started</p>
                <button
                  onClick={() => navigate('/teams/create')}
                  style={{
                    background: '#228B22',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create Team
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
                <p>No teams match your search</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                style={{
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
                  boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* Team Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                    color: isDark ? '#fff' : '#495057',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginRight: '12px'
                  }}>
                    {team.avatar}
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
                      fontSize: '13px',
                      color: isDark ? '#adb5bd' : '#6c757d'
                    }}>
                      {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Team Description */}
                {team.description && (
                  <p style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: isDark ? '#adb5bd' : '#6c757d',
                    lineHeight: '1.4'
                  }}>
                    {team.description}
                  </p>
                )}

                {/* Team Members Preview */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#adb5bd' : '#6c757d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Members
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {team.members?.slice(0, 5).map((member, idx) => (
                      <div
                        key={member.id}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isDark ? '#4a4a4a' : '#dee2e6',
                          color: isDark ? '#fff' : '#495057',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '600',
                          border: `2px solid ${isDark ? '#1a1a1a' : '#ffffff'}`
                        }}
                        title={member.name}
                      >
                        {member.avatar}
                      </div>
                    ))}
                    {team.member_count > 5 && (
                      <div style={{
                        fontSize: '12px',
                        color: isDark ? '#adb5bd' : '#6c757d',
                        marginLeft: '4px'
                      }}>
                        +{team.member_count - 5} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateTeamChat(team);
                    }}
                    style={{
                      flex: 1,
                      background: '#228B22',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    💬 Create Chat
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add team details/edit functionality
                      console.log('View team details:', team);
                    }}
                    style={{
                      background: 'transparent',
                      color: isDark ? '#adb5bd' : '#6c757d',
                      border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚙️ Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsListPage; 
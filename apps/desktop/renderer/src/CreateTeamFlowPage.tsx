import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, getCompanyUsers, User } from './lib/auth';
import { createTeam, createTeamChat } from './lib/chat';

// These types would ideally be in a central `types.ts` file
type TeamMember = {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'accepted';
  teamId?: string;
};

type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
};

type Channel = {
  id: string;
  name: string;
  messages: Message[];
};

export type Team = {
  id: string;
  name: string;
  members: TeamMember[];
  channels: Channel[];
};

type EventType = {
  id: string;
  name: string;
  teamId?: string;
};

// --- Sub-components ---
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

export default function CreateTeamFlowPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Load company users for suggestions
    const loadCompanyUsers = async () => {
      if (currentUser?.company_id) {
        try {
          const users = await getCompanyUsers(currentUser.company_id);
          setCompanyUsers(users.filter((u: User) => u.id !== currentUser.id)); // Exclude current user
        } catch (error) {
          console.error('Failed to load company users:', error);
        }
      }
    };

    loadCompanyUsers();

    // Load existing events to populate the assignment dropdown
    const savedEvents = localStorage.getItem('timely_events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }

    // Close dropdown on outside click
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMemberEmail(value);

    if (value.length > 0) {
      const filteredSuggestions = companyUsers.filter(user =>
        user.email.toLowerCase().includes(value.toLowerCase()) ||
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (selectedUser: User) => {
    setMemberEmail(selectedUser.email);
    setSuggestions([]);
    
    // Auto-add the user
    if (!members.some(m => m.email === selectedUser.email)) {
      const newMember: TeamMember = {
        id: selectedUser.id,
        email: selectedUser.email,
        name: selectedUser.name,
        status: 'accepted',
      };
      setMembers([...members, newMember]);
      setMemberEmail('');
    }
  };

  const handleAddMember = () => {
    if (memberEmail && !members.some(m => m.email === memberEmail)) {
      // Check if the email exists in company users
      const foundUser = companyUsers.find(u => u.email === memberEmail);
      if (foundUser) {
        const newMember: TeamMember = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          status: 'accepted',
        };
        setMembers([...members, newMember]);
        setMemberEmail('');
      } else {
        setErrorMessage('User not found in your company. Please invite users who are already part of your organization.');
      }
    }
  };

  const handleRemoveMember = (emailToRemove: string) => {
    setMembers(members.filter(m => m.email !== emailToRemove));
  };

  const handleNext = () => {
    if (step === 1 && !teamName.trim()) {
      setErrorMessage('Please enter a team name.');
      return;
    }
    if (step === 2 && members.length === 0) {
      setErrorMessage('Please add at least one member.');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreateTeam = async () => {
    if (!user) {
      setErrorMessage('You must be logged in to create a team.');
      return;
    }

    setIsLoading(true);
    try {
      // Create the team in Supabase
      const memberIds = members.map(m => m.id);
      const newTeam = await createTeam(
        user.id,
        user.company_id,
        teamName,
        teamDescription,
        memberIds
      );

      if (newTeam) {
        // Create a team chat automatically
        const teamChat = await createTeamChat(
          user.id,
          user.company_id,
          newTeam.id,
          `${teamName} Chat`
        );

        if (teamChat) {
          setSuccessMessage(`Team "${teamName}" created successfully with chat room!`);
          setTimeout(() => navigate('/teams/chat'), 2000);
        } else {
          setSuccessMessage(`Team "${teamName}" created successfully!`);
          setTimeout(() => navigate('/teams/chat'), 2000);
        }
      } else {
        setErrorMessage('Failed to create team. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      setErrorMessage('Failed to create team. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndAssignTeam = async () => {
    if (!selectedEventId) {
      setErrorMessage('Please select an event to assign the team to.');
      return;
    }

    await handleCreateTeam();

    // If team creation was successful, assign to event
    if (successMessage) {
      // 3. Assign the team to the selected event (keeping localStorage for events for now)
      const updatedEvents = events.map(event =>
        event.id === selectedEventId ? { ...event, teamId: `team_${Date.now()}` } : event
      );
      localStorage.setItem('timely_events', JSON.stringify(updatedEvents));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <label htmlFor="team-name" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: isDark ? '#ffffff' : '#000' }}>
              What is your team's name?
            </label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Project Alpha Team"
              style={{ 
                width: '100%', 
                padding: '18px', 
                fontSize: '20px', 
                borderRadius: '8px', 
                border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                background: isDark ? '#2a2a2a' : '#fff',
                color: isDark ? '#ffffff' : '#000',
                marginBottom: '20px'
              }}
            />
            <label htmlFor="team-description" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: isDark ? '#ffffff' : '#000' }}>
              Team description (optional)
            </label>
            <textarea
              id="team-description"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Brief description of the team's purpose..."
              rows={3}
              style={{ 
                width: '100%', 
                padding: '18px', 
                fontSize: '16px', 
                borderRadius: '8px', 
                border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                background: isDark ? '#2a2a2a' : '#fff',
                color: isDark ? '#ffffff' : '#000',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        );
      case 2:
        return (
          <div>
            <label htmlFor="member-email" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: isDark ? '#ffffff' : '#000' }}>
              Invite members to the team
            </label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }} ref={suggestionsRef}>
              <div style={{ flexGrow: 1 }}>
                <input
                  id="member-email"
                  type="email"
                  autoComplete="off"
                  value={memberEmail}
                  onChange={handleEmailChange}
                  placeholder="Search by name or email..."
                  style={{
                    width: '100%',
                    padding: '0 18px',
                    fontSize: '18px',
                    borderRadius: '8px',
                    border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                    height: '56px',
                    boxSizing: 'border-box',
                    background: isDark ? '#2a2a2a' : '#fff',
                    color: isDark ? '#ffffff' : '#000'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                />
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    width: 'calc(100% - 112px)',
                    background: isDark ? '#2a2a2a' : 'white',
                    border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                    borderRadius: '8px',
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {suggestions.map(user => (
                      <div
                        key={user.id}
                        onClick={() => handleSuggestionClick(user)}
                        style={{ padding: '12px 16px', cursor: 'pointer', color: isDark ? '#ffffff' : '#000' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#444' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#2a2a2a' : 'white'}
                      >
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '14px', color: isDark ? '#aaa' : '#6b7280' }}>{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddMember}
                style={{
                  background: isDark ? '#ffffff' : '#000',
                  color: isDark ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                  height: '56px',
                  width: '100px',
                  flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {members.map(member => (
                <div key={member.email} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: isDark ? '#2a2a2a' : '#f8f9fa', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: isDark ? '1px solid #444' : '1px solid #e0e0e0' 
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>{member.name}</div>
                    <div style={{ fontSize: '14px', color: isDark ? '#aaa' : '#6b7280' }}>{member.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.email)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', fontWeight: 'bold', color: isDark ? '#ffffff' : '#000', padding: '0 8px', lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <label htmlFor="assign-event" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px', color: isDark ? '#ffffff' : '#000' }}>
              Assign this team to an event
            </label>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                id="assign-event"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '18px',
                  fontSize: '20px',
                  borderRadius: '8px',
                  border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                  background: isDark ? '#2a2a2a' : 'white',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: selectedEventId ? (isDark ? '#ffffff' : '#000') : (isDark ? '#aaa' : '#888'),
                }}
              >
                {selectedEventId ? events.find(e => e.id === selectedEventId)?.name : 'Select an event...'}
                <span>▼</span>
              </button>
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  background: isDark ? '#2a2a2a' : 'white',
                  border: isDark ? '1.5px solid #555' : '1.5px solid #b0b0b0',
                  borderRadius: '8px',
                  marginTop: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {events.map(event => (
                    <div
                      key={event.id}
                      onClick={() => {
                        if (!event.teamId) {
                          setSelectedEventId(event.id);
                          setIsDropdownOpen(false);
                        }
                      }}
                      style={{
                        padding: '16px',
                        cursor: event.teamId ? 'not-allowed' : 'pointer',
                        color: event.teamId ? (isDark ? '#666' : '#aaa') : (isDark ? '#ffffff' : '#000'),
                        background: selectedEventId === event.id ? (isDark ? '#444' : '#f0f0f0') : (isDark ? '#2a2a2a' : 'white'),
                      }}
                      onMouseEnter={(e) => { if (!event.teamId) e.currentTarget.style.backgroundColor = isDark ? '#444' : '#f0f0f0'; }}
                      onMouseLeave={(e) => { if (selectedEventId !== event.id) e.currentTarget.style.backgroundColor = isDark ? '#2a2a2a' : 'white'; }}
                    >
                      {event.name} {event.teamId ? '(Already assigned)' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ background: isDark ? '#121212' : '#f7f8fa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {errorMessage && <CustomErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />}
      <div style={{ 
        maxWidth: '700px', 
        width: '100%', 
        background: isDark ? '#1e1e1e' : '#fff', 
        borderRadius: '16px', 
        boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.3)' : '0 4px 32px #0002', 
        padding: '48px 40px 64px 40px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '40px',
        border: isDark ? '1px solid #333' : 'none'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px', color: isDark ? '#ffffff' : '#000' }}>Create a New Team</h1>
          <p style={{ fontSize: '16px', color: isDark ? '#aaa' : '#6b7280' }}>
            Step {step} of 3: {step === 1 ? 'Team Name' : step === 2 ? 'Invite Members' : 'Assign to Event'}
          </p>
        </div>

        {renderStep()}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px' }}>
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{ 
                background: isDark ? '#444' : '#e5e7eb', 
                color: isDark ? '#ffffff' : '#374151', 
                border: 'none', 
                padding: '16px 32px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 600, 
                fontSize: '18px' 
              }}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              style={{ background: isDark ? '#ffffff' : '#000', color: isDark ? '#000' : '#fff', border: 'none', padding: '16px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '18px' }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreateAndAssignTeam}
              style={{ background: isDark ? '#ffffff' : '#000', color: isDark ? '#000' : '#fff', border: 'none', padding: '16px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '18px' }}
            >
              Create Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 
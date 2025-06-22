import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// These types would ideally be in a central `types.ts` file
type TeamMember = {
  id: string;
  email: string;
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

// Mock database of users who are allowed to be invited
const PERMITTED_USERS = [
  { name: 'Charles Level', email: 'charles@leveldesignagency.com' },
  { name: 'Design Agency', email: 'leveldesignagency@gmail.com' },
  { name: 'Charles Morgan', email: 'charlesmorgantravels@gmail.com' },
  { name: 'Support Team', email: 'support@leveldesignagency.com' },
];

// --- Sub-components ---
const CustomErrorModal = ({ message, onClose }: { message: string; onClose: () => void; }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 24px', fontSize: '18px' }}>{message}</p>
      <button onClick={onClose} style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 48px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}>
        OK
      </button>
    </div>
  </div>
);

export default function CreateTeamFlowPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<{name: string, email: string}[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      const filteredSuggestions = PERMITTED_USERS.filter(user =>
        user.email.toLowerCase().startsWith(value.toLowerCase()) ||
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (email: string) => {
    setMemberEmail(email);
    setSuggestions([]);
  };

  const handleAddMember = () => {
    if (memberEmail && !members.some(m => m.email === memberEmail)) {
      const newMember: TeamMember = {
        id: `member_${Date.now()}`,
        email: memberEmail,
        status: 'pending',
      };
      setMembers([...members, newMember]);
      setMemberEmail('');
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

  const handleCreateAndAssignTeam = () => {
    if (!selectedEventId) {
      setErrorMessage('Please select an event to assign the team to.');
      return;
    }

    // 1. Create the new team
    const newTeam: Team = {
      id: `team_${Date.now()}`,
      name: teamName,
      members: members,
      channels: [{ id: `channel_${Date.now()}`, name: 'general', messages: [] }],
    };

    // 2. Save the new team to the existing list of teams
    const savedTeams = JSON.parse(localStorage.getItem('timely_teams') || '[]') as Team[];
    const updatedTeams = [...savedTeams, newTeam];
    localStorage.setItem('timely_teams', JSON.stringify(updatedTeams));

    // 3. Assign the team to the selected event
    const updatedEvents = events.map(event =>
      event.id === selectedEventId ? { ...event, teamId: newTeam.id } : event
    );
    localStorage.setItem('timely_events', JSON.stringify(updatedEvents));

    setErrorMessage(`Team "${teamName}" created successfully!`);
    setTimeout(() => navigate('/teams/chat'), 1500); // Navigate after showing success
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <label htmlFor="team-name" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px' }}>
              What is your team's name?
            </label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Event Staff"
              style={{ width: '100%', padding: '18px', fontSize: '20px', borderRadius: '8px', border: '1.5px solid #b0b0b0' }}
            />
          </div>
        );
      case 2:
        return (
          <div>
            <label htmlFor="member-email" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px' }}>
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
                  placeholder="member@example.com"
                  style={{
                    width: '100%',
                    padding: '0 18px',
                    fontSize: '18px',
                    borderRadius: '8px',
                    border: '1.5px solid #b0b0b0',
                    height: '56px',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                />
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    width: 'calc(100% - 112px)',
                    background: 'white',
                    border: '1.5px solid #b0b0b0',
                    borderRadius: '8px',
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {suggestions.map(user => (
                      <div
                        key={user.email}
                        onClick={() => handleSuggestionClick(user.email)}
                        style={{ padding: '12px 16px', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddMember}
                style={{
                  background: '#000',
                  color: '#fff',
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
                <div key={member.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <span style={{ fontSize: '16px' }}>{member.email}</span>
                  <button
                    onClick={() => handleRemoveMember(member.email)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', fontWeight: 'bold', color: '#000', padding: '0 8px', lineHeight: 1 }}
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
            <label htmlFor="assign-event" style={{ display: 'block', fontSize: '18px', fontWeight: 500, marginBottom: '12px' }}>
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
                  border: '1.5px solid #b0b0b0',
                  background: 'white',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: selectedEventId ? '#000' : '#888',
                }}
              >
                {selectedEventId ? events.find(e => e.id === selectedEventId)?.name : 'Select an event...'}
                <span>▼</span>
              </button>
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  background: 'white',
                  border: '1.5px solid #b0b0b0',
                  borderRadius: '8px',
                  marginTop: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
                        color: event.teamId ? '#aaa' : '#000',
                        background: selectedEventId === event.id ? '#f0f0f0' : 'white',
                      }}
                      onMouseEnter={(e) => { if (!event.teamId) e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
                      onMouseLeave={(e) => { if (selectedEventId !== event.id) e.currentTarget.style.backgroundColor = 'white'; }}
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
    <div style={{ background: '#f7f8fa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {errorMessage && <CustomErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />}
      <div style={{ maxWidth: '700px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 32px #0002', padding: '48px 40px 64px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>Create a New Team</h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Step {step} of 3: {step === 1 ? 'Team Name' : step === 2 ? 'Invite Members' : 'Assign to Event'}
          </p>
        </div>

        {renderStep()}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px' }}>
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '16px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '18px' }}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              style={{ background: '#000', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '18px' }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreateAndAssignTeam}
              style={{ background: '#000', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '18px' }}
            >
              Create and Assign Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 
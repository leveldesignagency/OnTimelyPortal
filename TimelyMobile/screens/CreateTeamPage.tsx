import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface CreateTeamPageProps {
  onNavigate: (route: string) => void;
}

export default function CreateTeamPage({ onNavigate }: CreateTeamPageProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: teamsData, error } = await supabase
          .from('teams')
          .select('*')
          .eq('company_id', userProfile.company_id);

        if (error) {
          console.error('Error loading teams:', error);
        } else {
          setTeams(teamsData || []);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: usersData, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('company_id', userProfile.company_id);

        if (error) {
          console.error('Error loading users:', error);
        } else {
          setAvailableUsers(usersData || []);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        // Create team
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            description: description,
            company_id: userProfile.company_id,
            created_by: user.id,
          })
          .select()
          .single();

        if (teamError) {
          console.error('Error creating team:', teamError);
          Alert.alert('Error', 'Failed to create team');
          return;
        }

        // Add team members
        if (selectedMembers.length > 0) {
          const teamMembers = selectedMembers.map(member => ({
            team_id: team.id,
            user_id: member.id,
          }));

          const { error: membersError } = await supabase
            .from('team_members')
            .insert(teamMembers);

          if (membersError) {
            console.error('Error adding team members:', membersError);
          }
        }

        Alert.alert('Success', 'Team created successfully!', [
          { text: 'OK', onPress: () => {
            setShowCreateForm(false);
            setTeamName('');
            setDescription('');
            setSelectedMembers([]);
            setMemberSearch('');
            setSearchResults([]);
            loadTeams();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: usersData, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('company_id', userProfile.company_id)
          .ilike('name', `%${query}%`)
          .limit(10);

        if (error) {
          console.error('Error searching users:', error);
        } else {
          // Filter out already selected users
          const filteredResults = (usersData || []).filter(
            user => !selectedMembers.some(selected => selected.id === user.id)
          );
          setSearchResults(filteredResults);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addMember = (user: any) => {
    console.log('Adding member:', user); // Debug log
    if (!selectedMembers.some(member => member.id === user.id)) {
      setSelectedMembers(prev => [...prev, user]);
    }
    setMemberSearch('');
    setSearchResults([]);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(member => member.id !== userId));
  };

  const getSuggestedUsers = () => {
    return availableUsers
      .filter(user => !selectedMembers.some(selected => selected.id === user.id))
      .slice(0, 5);
  };

  const getTeamInitials = (teamName: string): string => {
    return teamName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (showCreateForm) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setShowCreateForm(false)} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Team</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContentContainer}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Team Details</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Team Name"
              placeholderTextColor="#888"
              value={teamName}
              onChangeText={setTeamName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Add Members</Text>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#888"
                value={memberSearch}
                onChangeText={(text) => {
                  setMemberSearch(text);
                  searchUsers(text);
                }}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color="#10b981" style={styles.searchLoading} />
              )}
            </View>

            {/* Quick Suggestions */}
            {memberSearch.trim() === '' && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Quick Add (Recent/Frequent)</Text>
                <View style={styles.suggestionsList}>
                  {getSuggestedUsers().map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.suggestionItem}
                      onPress={() => addMember(user)}
                    >
                      <View style={styles.suggestionAvatar}>
                                              <Text style={styles.suggestionInitials}>
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.suggestionName}>{user.name || user.email || 'Unknown User'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search Results */}
            {memberSearch.trim() !== '' && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>
                  Search Results ({searchResults.length})
                </Text>
                {searchResults.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.searchResultItem}
                    onPress={() => addMember(user)}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultInitials}>
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.searchResultDetails}>
                      <Text style={styles.searchResultName}>{user.name || user.email || 'Unknown User'}</Text>
                      <Text style={styles.searchResultEmail}>{user.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {searchResults.length === 0 && memberSearch.trim() !== '' && (
                  <Text style={styles.noResultsText}>No users found</Text>
                )}
              </View>
            )}

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <View style={styles.selectedMembersContainer}>
                <Text style={styles.selectedMembersTitle}>
                  Selected Members ({selectedMembers.length})
                </Text>
                <View style={styles.selectedMembersList}>
                  {selectedMembers.map(member => (
                    <View key={member.id} style={styles.selectedMemberTag}>
                      <View style={styles.selectedMemberAvatar}>
                        {member.avatar_url ? (
                          <Image 
                            source={{ uri: member.avatar_url }} 
                            style={styles.selectedMemberAvatarImage}
                          />
                        ) : (
                          <Text style={styles.selectedMemberInitials}>
                            {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.selectedMemberName}>{member.name || member.email || 'Unknown User'}</Text>
                      <TouchableOpacity
                        style={styles.removeMemberButton}
                        onPress={() => removeMember(member.id)}
                      >
                        <MaterialCommunityIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.createTeamButton, loading && styles.disabledButton]}
            onPress={handleCreateTeam}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createTeamButtonText}>Create Team</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teams</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateForm(true)}
          style={styles.createButton}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.teamsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group" size={64} color="#666" />
            <Text style={styles.emptyText}>No teams yet</Text>
            <Text style={styles.emptySubtext}>Create your first team to get started</Text>
          </View>
        ) : (
          teams.map(team => (
            <View key={team.id} style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <View style={styles.teamAvatar}>
                  <Text style={styles.teamInitials}>
                    {getTeamInitials(team.name)}
                  </Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  {team.description && (
                    <Text style={styles.teamDescription}>{team.description}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  createTeamButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    minWidth: 200,
  },
  createTeamButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  formContentContainer: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMember: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#10b981',
    borderWidth: 0,
  },
  suggestionAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  suggestionName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  searchResultsContainer: {
    marginBottom: 16,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  searchResultsTitle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchResultDetails: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  searchResultEmail: {
    fontSize: 12,
    color: '#666',
  },
  noResultsText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  selectedMembersContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedMembersTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  selectedMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedMemberTag: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 160,
    minWidth: 'fit-content',
  },
  selectedMemberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMemberAvatarImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  selectedMemberInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedMemberName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  removeMemberButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitials: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    color: '#888',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  teamsContainer: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  teamCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  teamInitials: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  teamDescription: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
}); 
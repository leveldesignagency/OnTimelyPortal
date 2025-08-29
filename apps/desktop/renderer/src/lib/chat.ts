import { supabase } from './supabase'
import { User, getCurrentUser, validateCompanyAccess, getCurrentUserCompanyId } from './auth'

export interface Chat {
  id: string
  company_id: string
  name: string | null
  type: 'direct' | 'group' | 'team'
  avatar: string
  created_by: string
  team_id?: string
  is_archived: boolean
  created_at: string
  updated_at: string
  participants?: (User & { is_muted?: boolean; is_pinned?: boolean; role?: string })[]
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'audio' | 'location'
  file_url?: string
  file_name?: string
  file_size?: number
  reply_to_id?: string
  is_edited: boolean
  edited_at?: string
  created_at: string
  updated_at: string
  sender?: User
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: User
}

export interface ChatParticipant {
  id: string
  chat_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  is_muted: boolean
  is_pinned: boolean
  user?: User
}

export interface Team {
  id: string
  company_id: string
  name: string
  description?: string
  avatar: string
  created_by: string
  is_archived: boolean
  created_at: string
  updated_at: string
  members?: TeamMember[]
  member_count?: number
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user?: User
}

export interface TeamInvitation {
  id: string
  team_id: string
  invited_by: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitation_token: string
  expires_at: string
  accepted_at?: string
  created_at: string
  updated_at: string
  team?: Team
  invited_by_user?: User
}

// Enhanced team functions with company isolation - ONLY show teams user is a member of
export const getCompanyTeams = async (companyId: string): Promise<Team[]> => {
  try {
    // Validate company access
    if (!(await validateCompanyAccess(companyId))) {
      console.error('❌ Access denied to company teams')
      return []
    }

    // Get current user to check their team memberships
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      console.error('❌ No authenticated user found')
      return []
    }

    // Get teams where the user is a member
    const { data: userTeams, error: userTeamsError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        team:teams!team_members_team_id_fkey(
          *,
          team_members(
            id,
            user_id,
            role,
            joined_at,
            user:users!team_members_user_id_fkey(*)
          )
        )
      `)
      .eq('user_id', currentUser.id)
      .eq('team.company_id', companyId)
      .eq('team.is_archived', false)

    if (userTeamsError) {
      console.error('❌ Failed to fetch user teams:', userTeamsError)
      return []
    }

    // Transform the data to match expected format
    const teams = (userTeams || []).map(ut => ({
      ...ut.team,
      members: ut.team.team_members || [],
      member_count: ut.team.team_members?.length || 0
    }))

    console.log(`✅ User ${currentUser.email} can see ${teams.length} teams:`, 
      teams.map(t => ({ id: t.id, name: t.name, created_by: t.created_by }))
    )

    return teams
  } catch (error) {
    console.error('Failed to fetch company teams:', error)
    return []
  }
}

// Enhanced team creation with strict validation
export const createTeam = async (
  creatorId: string,
  companyId: string,
  teamName: string,
  description?: string,
  memberIds: string[] = []
): Promise<Team | null> => {
  console.log('🚀 Starting team creation with params:', {
    creatorId,
    companyId,
    teamName,
    description,
    memberIds
  })

  try {
    // Validate company access
    console.log('🔍 Validating company access for:', companyId)
    if (!(await validateCompanyAccess(companyId))) {
      console.error('❌ Company access validation failed')
      throw new Error('Access denied: Cannot create team in this company')
    }
    console.log('✅ Company access validated')

    // Validate creator belongs to company
    console.log('🔍 Getting current user...')
    const currentUser = await getCurrentUser()
    console.log('👤 Current user:', currentUser)
    
    if (!currentUser) {
      console.error('❌ No current user found')
      throw new Error('No authenticated user')
    }

    if (currentUser.id !== creatorId) {
      console.error('❌ Creator ID mismatch:', { currentUserId: currentUser.id, creatorId })
      throw new Error('Access denied: Creator ID does not match current user')
    }

    if (currentUser.company_id !== companyId) {
      console.error('❌ Company ID mismatch:', { userCompanyId: currentUser.company_id, companyId })
      throw new Error('Access denied: Creator must belong to the specified company')
    }
    console.log('✅ Creator validation passed')

    // Create the team directly
    console.log('🏗️ Creating team in database...')
    
    // Generate simple initials for avatar instead of encoded name
    const getInitials = (name: string) => {
      return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2)
    }
    
    const teamInsert = {
      company_id: companyId,
      name: teamName,
      description: description,
      avatar: getInitials(teamName),
      created_by: creatorId,
      is_archived: false
    }
    console.log('📝 Team insert data:', teamInsert)

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert(teamInsert)
      .select()
      .single()

    if (teamError) {
      console.error('❌ Team creation database error:', teamError)
      console.error('❌ Error details:', {
        message: teamError.message,
        details: teamError.details,
        hint: teamError.hint,
        code: teamError.code
      })
      throw teamError
    }

    if (!teamData) {
      console.error('❌ No team data returned from database')
      throw new Error('No team data returned from database')
    }

    console.log('✅ Team created successfully:', teamData)

    // Add creator as admin member
    console.log('👥 Adding team members...')
    const memberInserts = [
      {
        team_id: teamData.id,
        user_id: creatorId,
        role: 'admin' as const
      }
    ]

    // Add other members as regular members
    memberIds.forEach(memberId => {
      if (memberId !== creatorId) {
        memberInserts.push({
          team_id: teamData.id,
          user_id: memberId,
          role: 'admin' as const
        })
      }
    })

    console.log('📝 Member inserts:', memberInserts)

    const { error: membersError } = await supabase
      .from('team_members')
      .insert(memberInserts)

    if (membersError) {
      console.error('❌ Team members insertion error:', membersError)
      console.error('❌ Members error details:', {
        message: membersError.message,
        details: membersError.details,
        hint: membersError.hint,
        code: membersError.code
      })
      
      // Clean up the team if member insertion fails
      console.log('🧹 Cleaning up team due to member insertion failure...')
      await supabase.from('teams').delete().eq('id', teamData.id)
      throw membersError
    }

    console.log('✅ Team members added successfully:', memberInserts.length)

    // Fetch the complete team with members
    console.log('📊 Fetching complete team data...')
    const { data: completeTeam, error: fetchError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(
          id,
          user_id,
          role,
          joined_at,
          user:users!team_members_user_id_fkey(*)
        )
      `)
      .eq('id', teamData.id)
      .single()

    if (fetchError) {
      console.error('❌ Team fetch error:', fetchError)
      console.error('❌ Fetch error details:', {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      })
      throw fetchError
    }

    if (!completeTeam) {
      console.error('❌ No complete team data returned')
      throw new Error('Failed to fetch complete team data')
    }

    const result = {
      ...completeTeam,
      members: completeTeam.team_members || [],
      member_count: completeTeam.team_members?.length || 0
    }

    console.log('🎉 Complete team created successfully:', result)
    return result
  } catch (error) {
    console.error('💥 Team creation failed with error:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// Create a team chat (group chat linked to a team)
export const createTeamChat = async (
  creatorId: string,
  companyId: string,
  teamId: string,
  chatName?: string
): Promise<Chat | null> => {
  try {
    console.log('🚀 Creating team chat:', { creatorId, companyId, teamId, chatName });

    // Validate company access
    if (!(await validateCompanyAccess(companyId))) {
      console.error('❌ Company access denied for company:', companyId);
      throw new Error('Access denied: Cannot create team chat in this company');
    }
    console.log('✅ Company access validated');

    // Get team info and members
    console.log('🔍 Fetching team data...');
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(user_id, user:users!team_members_user_id_fkey(*))
      `)
      .eq('id', teamId)
      .eq('company_id', companyId)
      .single()

    if (teamError) {
      console.error('❌ Failed to fetch team data:', teamError);
      throw teamError;
    }

    if (!teamData) {
      console.error('❌ Team not found:', teamId);
      throw new Error('Team not found');
    }

    console.log('✅ Team data fetched:', teamData.name, 'with', teamData.team_members?.length || 0, 'members');

    // Check if team chat already exists
    console.log('🔍 Checking for existing team chat...');
    const { data: existingChat, error: existingError } = await supabase
      .from('chats')
      .select('*')
      .eq('team_id', teamId)
      .eq('company_id', companyId)
      .eq('type', 'team')
      .eq('is_archived', false)
      .single()

    if (!existingError && existingChat) {
      console.log('✅ Found existing team chat:', existingChat.id);
      // Fetch complete chat data
      const { data: completeChat, error: fetchError } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants(
            id,
            user_id,
            role,
            joined_at,
            is_muted,
            is_pinned,
            user:users!chat_participants_user_id_fkey(*)
          )
        `)
        .eq('id', existingChat.id)
        .single()

      if (!fetchError && completeChat) {
        return {
          ...completeChat,
          participants: completeChat.chat_participants?.map(cp => cp.user).filter(Boolean) || []
        }
      }
    }

    const participantIds = teamData.team_members?.map(member => member.user_id) || []
    
    // Ensure creator is included in participants
    if (!participantIds.includes(creatorId)) {
      participantIds.push(creatorId);
    }

    console.log('👥 Team participants:', participantIds);

    const finalChatName = chatName || `${teamData.name} Chat`
    console.log('📝 Creating chat with name:', finalChatName);

    // Create the chat
    const chatInsert = {
      company_id: companyId,
      name: finalChatName,
      type: 'team' as const,
      avatar: teamData.avatar || teamData.name.substring(0, 2).toUpperCase(),
      created_by: creatorId,
      team_id: teamId,
      is_archived: false
    };

    console.log('📝 Chat insert data:', chatInsert);

    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert(chatInsert)
      .select()
      .single()

    if (chatError) {
      console.error('❌ Failed to create chat:', chatError);
      throw chatError;
    }

    console.log('✅ Chat created successfully:', chatData.id);

    // Add all team members as chat participants
    const participantInserts = participantIds.map(userId => ({
      chat_id: chatData.id,
      user_id: userId,
      role: "member" as const,
      joined_at: new Date().toISOString(),
      is_muted: false,
      is_pinned: false,
      company_id: companyId
    }))

    console.log('👥 Adding participants:', participantInserts.length, 'participants');

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts)

    if (participantsError) {
      console.error('❌ Failed to add participants:', participantsError);
      // Clean up chat if participants insertion fails
      await supabase.from('chats').delete().eq('id', chatData.id);
      throw participantsError;
    }

    console.log('✅ Participants added successfully');

    // Fetch the complete chat data with participants
    console.log('📋 Fetching complete chat data...');
    const { data: completeChat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(
          id,
          user_id,
          role,
          joined_at,
          is_muted,
          is_pinned,
          user:users!chat_participants_user_id_fkey(*)
        )
      `)
      .eq('id', chatData.id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch complete chat:', fetchError);
      throw fetchError;
    }

    console.log('🎉 Team chat created successfully:', completeChat.id);

    return {
      ...completeChat,
      participants: completeChat.chat_participants?.map(cp => cp.user).filter(Boolean) || []
    }
  } catch (error) {
    console.error('💥 Failed to create team chat:', error)
    return null  // Return null instead of throwing to avoid breaking team creation
  }
}

// Enhanced user search with company isolation
export const searchCompanyUsersForTeam = async (companyId: string, searchQuery: string): Promise<User[]> => {
  try {
    // Validate company access
    if (!validateCompanyAccess(companyId)) {
      return []
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .order('name')
      .limit(10)

    if (error) throw error

    console.log(`🔍 Company user search results for "${searchQuery}":`, data)
    return data || []
  } catch (error) {
    console.error('Failed to search company users for team:', error)
    return []
  }
}

// Enhanced chat creation with company validation
export const createDirectChat = async (user1Id: string, user2Id: string, companyId: string): Promise<Chat | null> => {
  try {
    console.log('🔧 Creating direct chat:', { user1Id, user2Id, companyId });
    
    // Get current user for debugging
    const currentUser = await getCurrentUser();
    console.log('👤 Current user:', currentUser);
    
    // Validate company access
    if (!validateCompanyAccess(companyId)) {
      const errorMsg = `Access denied: Cannot create chat in company ${companyId}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ Company access validated');

    // Check if a direct chat already exists between these users
    console.log('🔍 Checking for existing direct chat...');
    const { data: existingChat, error: existingError } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(user_id)
      `)
      .eq('company_id', companyId)
      .eq('type', 'direct')
      .eq('is_archived', false)

    if (existingError) {
      console.error('❌ Error checking existing chats:', existingError);
    } else {
      console.log('📋 Existing chats found:', existingChat?.length || 0);
    }

    if (!existingError && existingChat) {
      // Find chat where both users are participants
      const directChat = existingChat.find(chat => {
        const participantIds = chat.chat_participants?.map(p => p.user_id) || []
        return participantIds.length === 2 && 
               participantIds.includes(user1Id) && 
               participantIds.includes(user2Id)
      })

      if (directChat) {
        console.log('✅ Found existing direct chat:', directChat.id);
        // Fetch complete chat data
        const { data: completeChat, error: fetchError } = await supabase
          .from('chats')
          .select(`
            *,
            chat_participants(
              id,
              user_id,
              joined_at,
              is_muted,
              is_pinned,
              user:users!chat_participants_user_id_fkey(*)
            )
          `)
          .eq('id', directChat.id)
          .single()

        if (!fetchError && completeChat) {
          return {
            ...completeChat,
            participants: completeChat.chat_participants?.map(cp => cp.user).filter(Boolean) || []
          }
        }
      }
    }

    // Create new direct chat
    console.log('🆕 Creating new direct chat...');
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        company_id: companyId,
        name: 'Direct Chat',
        type: 'direct',
        avatar: 'DC',
        created_by: user1Id,
        is_archived: false
      })
      .select()
      .single()

    if (chatError) {
      console.error('❌ Chat creation error:', chatError)
      throw chatError
    }

    console.log('✅ Chat created successfully:', chatData.id);

    // Add participants
    console.log('👥 Adding participants...');
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_id: chatData.id, user_id: user1Id, role: "member" as const, company_id: companyId },
        { chat_id: chatData.id, user_id: user2Id, role: "member" as const, company_id: companyId }
      ])

    if (participantsError) {
      console.error('❌ Chat participants error:', participantsError)
      // Clean up chat if participants insertion fails
      await supabase.from('chats').delete().eq('id', chatData.id)
      throw participantsError
    }

    console.log('✅ Participants added successfully');

    // Fetch the complete chat
    console.log('📋 Fetching complete chat data...');
    const { data: completeChat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(
          id,
          user_id,
          joined_at,
          is_muted,
          is_pinned,
          user:users!chat_participants_user_id_fkey(*)
        )
      `)
      .eq('id', chatData.id)
      .single()

    if (fetchError) {
      console.error('❌ Chat fetch error:', fetchError)
      throw fetchError
    }

    console.log('✅ Direct chat created successfully!');
    return {
      ...completeChat,
      participants: completeChat.chat_participants?.map(cp => cp.user).filter(Boolean) || []
    }
  } catch (error) {
    console.error('❌ Failed to create direct chat:', error)
    return null
  }
}

// Enhanced group chat creation with company validation
export const createGroupChat = async (
  creatorId: string, 
  companyId: string, 
  groupName: string, 
  participantIds: string[]
): Promise<Chat | null> => {
  try {
    console.log('🚀 createGroupChat called with:', {
      creatorId,
      companyId,
      groupName,
      participantIds
    });

    // Validate company access
    console.log('🔍 Validating company access...');
    if (!validateCompanyAccess(companyId)) {
      console.error('❌ Company access validation failed');
      throw new Error('Access denied: Cannot create group chat in this company')
    }
    console.log('✅ Company access validated');

    // Ensure creator is in participants
    const allParticipants = Array.from(new Set([creatorId, ...participantIds]))
    console.log('👥 All participants (including creator):', allParticipants);
    
    // Generate simple initials for avatar instead of encoded name
    const getInitials = (name: string) => {
      return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2)
    }

    const avatar = getInitials(groupName);
    console.log('🎨 Generated avatar:', avatar);

    // Create the group chat
    console.log('🏗️ Creating group chat in database...');
    const chatInsert = {
      company_id: companyId,
      name: groupName,
      type: 'group',
      avatar: avatar,
      created_by: creatorId,
      is_archived: false
    };
    console.log('📝 Chat insert data:', chatInsert);

    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert(chatInsert)
      .select()
      .single()

    if (chatError) {
      console.error('❌ Group chat creation error:', chatError)
      throw chatError
    }

    console.log('✅ Group chat created successfully:', chatData);

    // Add all participants
    console.log('👥 Adding participants to group...');
    const participantInserts = allParticipants.map(userId => ({
      chat_id: chatData.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
      is_muted: false,
      is_pinned: false,
      role: "member" as const,
      company_id: companyId
    }))

    console.log('📝 Participant inserts:', participantInserts);

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts)

    if (participantsError) {
      console.error('❌ Group chat participants error:', participantsError)
      console.log('🧹 Cleaning up chat due to participants error...');
      // Clean up chat if participants insertion fails
      await supabase.from('chats').delete().eq('id', chatData.id)
      throw participantsError
    }

    console.log('✅ Participants added successfully');

    // Fetch the complete chat
    console.log('🔄 Fetching complete chat data...');
    const { data: completeChat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(
          id,
          user_id,
          role,
          joined_at,
          is_muted,
          is_pinned,
          user:users!chat_participants_user_id_fkey(*)
        )
      `)
      .eq('id', chatData.id)
      .single()

    if (fetchError) {
      console.error('❌ Group chat fetch error:', fetchError)
      throw fetchError
    }

    console.log('📦 Complete chat data fetched:', completeChat);

    const result = {
      ...completeChat,
      participants: completeChat.chat_participants?.map(cp => cp.user).filter(Boolean) || []
    };

    console.log('🎉 Group chat creation completed successfully:', result);
    return result;
  } catch (error) {
    console.error('💥 Failed to create group chat:', error)
    return null
  }
}

// Enhanced user chats with company isolation
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    console.log('🔍 getUserChats called for user:', userId);
    
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.id !== userId) {
      console.error('❌ Access denied: Can only fetch chats for current user');
      throw new Error('Access denied: Can only fetch chats for current user')
    }

    console.log('👤 Current user validated:', currentUser.id);
    console.log('🏢 Company ID:', currentUser.company_id);

    // First, get all chat IDs where the user is a participant
    console.log('🔍 Step 1: Finding chats where user is participant...');
    const { data: participantChats, error: participantError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId)

    if (participantError) {
      console.error('❌ Error finding participant chats:', participantError);
      throw participantError;
    }

    console.log('📋 Found participant chats:', participantChats?.length || 0);
    
    if (!participantChats || participantChats.length === 0) {
      console.log('⚠️ No chats found for user');
      return [];
    }

    const chatIds = participantChats.map(pc => pc.chat_id);
    console.log('🎯 Chat IDs to fetch:', chatIds);

    // Now get the full chat data for these chats
    console.log('🔍 Step 2: Fetching full chat data...');
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(
          id,
          user_id,
          joined_at,
          is_muted,
          is_pinned,
          role,
          user:users!chat_participants_user_id_fkey(*)
        )
      `)
      .in('id', chatIds)
      .eq('company_id', currentUser.company_id) // Company isolation
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching chats:', error);
      throw error;
    }

    console.log('✅ Successfully fetched chats:', data?.length || 0);
    
    const processedChats = (data || []).map(chat => {
      const participants = chat.chat_participants?.map(cp => ({
        ...cp.user,
        is_muted: cp.is_muted,
        is_pinned: cp.is_pinned,
        role: cp.role
      })).filter(Boolean) || [];
      console.log(`📋 Chat "${chat.name}" has ${participants.length} participants:`, participants.map(p => p.name));
      
      return {
        ...chat,
        participants
      };
    });

    console.log('✅ Processed chats:', processedChats.length);
    return processedChats;
  } catch (error) {
    console.error('❌ Failed to fetch user chats:', error)
    return []
  }
}

// Get messages for a chat
export const getChatMessages = async (chatId: string, limit: number = 50): Promise<Message[]> => {
  try {
    console.log('🔍 getChatMessages called for chat:', chatId);
    
    // Validate user has access to this chat
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      console.error('❌ No authenticated user found');
      throw new Error('No authenticated user')
    }
    
    console.log('👤 Current user in getChatMessages:', currentUser);

    // Check if chat belongs to user's company and user is participant
    console.log('🔍 Checking chat access...');
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        company_id,
        chat_participants!inner(user_id)
      `)
      .eq('id', chatId)
      .eq('chat_participants.user_id', currentUser.id)
      .single()

    console.log('🔍 Chat access query result:', { chat, chatError });

    if (chatError || !chat) {
      console.error('❌ Chat not found or access denied:', chatError);
      throw new Error('Chat not found or access denied')
    }

    console.log('✅ Chat found, checking company access...');
    if (!validateCompanyAccess(chat.company_id)) {
      console.error('❌ Company access denied for company:', chat.company_id);
      throw new Error('Access denied: Chat not in your company')
    }

    console.log('✅ Company access validated, fetching messages...');
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*),
        reactions:message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:users!message_reactions_user_id_fkey(*)
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit)

    console.log('📨 Messages query result:', { messageCount: data?.length || 0, error });

    if (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }

    console.log('✅ Messages fetched successfully:', data?.length || 0, 'messages');
    return (data || []).reverse()
  } catch (error) {
    console.error('❌ Failed to fetch chat messages:', error)
    return []
  }
}

// Send a message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string,
  messageType: Message['message_type'] = 'text',
  replyToId?: string
): Promise<Message | null> => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.id !== senderId) {
      throw new Error('Access denied: Can only send messages as current user')
    }

    // Validate chat access (same as getChatMessages)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        company_id,
        chat_participants!inner(user_id)
      `)
      .eq('id', chatId)
      .eq('chat_participants.user_id', currentUser.id)
      .single()

    if (chatError || !chat || !validateCompanyAccess(chat.company_id)) {
      throw new Error('Access denied: Cannot send message to this chat')
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
        message_type: messageType,
        reply_to_id: replyToId
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*),
        reactions:message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:users!message_reactions_user_id_fkey(*)
        )
      `)
      .single()

    if (error) throw error

    // Update chat's updated_at timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId)

    return data
  } catch (error) {
    console.error('Failed to send message:', error)
    return null
  }
}

// Add reaction to message
export const addMessageReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    console.log('addMessageReaction params:', { messageId, userId, emoji, userIdType: typeof userId });
    if (!currentUser || currentUser.id !== userId) {
      console.error('addMessageReaction: User mismatch or not authenticated', { currentUser, userId });
      return false;
    }
    // Check if userId is a valid UUID (basic check)
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error('addMessageReaction: userId is not a valid UUID', { userId });
      return false;
    }
    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: userId,
        emoji
      });
    if (error) {
      console.error('addMessageReaction: Supabase error', error, { messageId, userId, emoji });
      return false;
    }
    return true;
  } catch (error) {
    console.error('addMessageReaction: Exception', error, { messageId, userId, emoji });
    return false;
  }
};

// Remove reaction from message
export const removeMessageReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    console.log('removeMessageReaction params:', { messageId, userId, emoji, userIdType: typeof userId });
    if (!currentUser || currentUser.id !== userId) {
      console.error('removeMessageReaction: User mismatch or not authenticated', { currentUser, userId });
      return false;
    }
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.error('removeMessageReaction: userId is not a valid UUID', { userId });
      return false;
    }
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) {
      console.error('removeMessageReaction: Supabase error', error, { messageId, userId, emoji });
      return false;
    }
    return true;
  } catch (error) {
    console.error('removeMessageReaction: Exception', error, { messageId, userId, emoji });
    return false;
  }
};

// Real-time subscriptions with company isolation
export const subscribeToMessages = (chatId: string, onMessage: (message: Message) => void) => {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    console.error('No authenticated user for message subscription')
    return null
  }

  return supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      async (payload) => {
        console.log('New message received:', payload.new)
        
        // Fetch complete message with relations
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(*),
            reactions:message_reactions(
              id,
              emoji,
              user_id,
              created_at,
              user:users!message_reactions_user_id_fkey(*)
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (!error && data) {
          onMessage(data)
        }
      }
    )
    .subscribe()
}

export const subscribeToUserStatus = (companyId: string, onStatusChange: (user: User) => void) => {
  const currentUser = getCurrentUser()
  if (!currentUser || !validateCompanyAccess(companyId)) {
    console.error('Access denied for user status subscription')
    return null
  }

  return supabase
    .channel(`user_status:${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `company_id=eq.${companyId}`
      },
      (payload) => {
        console.log('User status updated:', payload.new)
        onStatusChange(payload.new as User)
      }
    )
    .subscribe()
}

// Team invitation functions (keeping the existing ones with validation)
export const getTeamInvitations = async (teamId: string): Promise<TeamInvitation[]> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return []

    // Validate team access
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('company_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team || !validateCompanyAccess(team.company_id)) {
      return []
    }

    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams(*),
        invited_by_user:users!invited_by(*)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch team invitations:', error)
    return []
  }
}

export const getUserPendingInvitations = async (email: string): Promise<TeamInvitation[]> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return []

    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams!inner(
          id,
          name,
          company_id,
          description,
          avatar
        ),
        invited_by_user:users!invited_by(*)
      `)
      .eq('email', email)
      .eq('status', 'pending')
      .eq('team.company_id', currentUser.company_id) // Only invitations from same company
      .gt('expires_at', new Date().toISOString())

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch user pending invitations:', error)
    return []
  }
}

export const acceptTeamInvitation = async (
  invitationToken: string,
  userId: string
): Promise<boolean> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser || currentUser.id !== userId) {
      return false
    }

    const { data, error } = await supabase
      .rpc('accept_team_invitation', {
        p_invitation_token: invitationToken,
        p_user_id: userId,
      role: "member" as const
      })

    return !error && data
  } catch (error) {
    console.error('Failed to accept team invitation:', error)
    return false
  }
}

export const declineTeamInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)

    return !error
  } catch (error) {
    console.error('Failed to decline team invitation:', error)
    return false
  }
}

export const cancelTeamInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    return !error
  } catch (error) {
    console.error('Failed to cancel team invitation:', error)
    return false
  }
}

export const resendTeamInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('team_invitations')
      .update({ 
        expires_at: newExpiryDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    return !error
  } catch (error) {
    console.error('Failed to resend team invitation:', error)
    return false
  }
}

export const removeUserFromGroup = async (
  chatId: string,
  userId: string,
  removedBy: string
): Promise<boolean> => {
  try {
    console.log('🗑️ REMOVE USER FROM GROUP - Starting process:', {
      chatId,
      userId,
      removedBy
    });

    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.id !== removedBy) {
      console.error('❌ Authentication failed or user mismatch:', {
        currentUser: currentUser?.id,
        removedBy
      });
      return false
    }

    // Validate chat access and company isolation
    console.log('🔍 Validating chat access and permissions...');
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        company_id, 
        created_by,
        type,
        name,
        chat_participants!inner(user_id)
      `)
      .eq('id', chatId)
      .eq('chat_participants.user_id', removedBy)
      .single()

    console.log('📋 Chat validation result:', { chat, chatError });

    if (chatError || !chat) {
      console.error('❌ Chat not found or access denied:', chatError);
      return false
    }

    if (!validateCompanyAccess(chat.company_id)) {
      console.error('❌ Company access validation failed');
      return false
    }

    // Permission check based on chat type
    console.log('🔍 Permission check:', {
      chatType: chat.type,
      chatCreator: chat.created_by,
      removedBy,
      userId
    });
    
    if (chat.type === 'group') {
      // For group chats, only the creator (admin) can remove users
    const isCreator = chat.created_by === removedBy;
    if (!isCreator) {
        console.error('❌ Only group creator can remove users from groups');
        return false;
      }
    } else if (chat.type === 'direct') {
      // For direct chats, any participant can remove the other participant or themselves
      const isParticipant = chat.chat_participants.some(p => p.user_id === removedBy);
      if (!isParticipant) {
        console.error('❌ Only chat participants can remove users from direct chats');
        return false;
      }
    } else {
      console.error('❌ Unsupported chat type for user removal:', chat.type);
      return false;
    }

    // Check if creator is removing themselves
    const isCreatorLeavingGroup = userId === removedBy;
    console.log('🔍 Self-removal check:', { userId, removedBy, isCreatorLeavingGroup });
    
    if (isCreatorLeavingGroup) {
      // Get other participants to potentially transfer ownership
      const otherMembers = chat.chat_participants.filter(p => p.user_id !== userId);
      console.log('👥 Other members for ownership transfer:', otherMembers);
      
      if (otherMembers.length > 0) {
        // Transfer ownership to the first other member
        const newOwnerId = otherMembers[0].user_id;
        console.log('🔄 Transferring ownership to:', newOwnerId);
        
        const { error: transferError } = await supabase
          .from('chats')
          .update({ created_by: newOwnerId })
          .eq('id', chatId);
          
        if (transferError) {
          console.error('❌ Failed to transfer ownership:', transferError);
          return false;
        }
        
        console.log(`✅ Ownership transferred to user ${newOwnerId}`);
      }
    }

    // First, let's verify the user actually exists in the chat_participants table
    console.log('🔍 Checking if user exists in chat_participants before deletion...');
    const { data: existingParticipant, error: checkError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    console.log('📋 Pre-deletion check result:', { 
      existingParticipant, 
      checkError,
      chatIdType: typeof chatId,
      userIdType: typeof userId,
      chatIdValue: chatId,
      userIdValue: userId
    });

    if (!existingParticipant) {
      console.error('❌ User not found in chat_participants table!');
      return false;
    }

    // Attempt to remove user from chat participants
    console.log('🗑️ Attempting to remove user from chat_participants...');
    const { data: deleteResult, error: deleteError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .select(); // Select to get the deleted row back

    console.log('🔄 Delete operation result:', { 
      deleteResult, 
      deleteError,
      deletedRows: deleteResult?.length || 0
    });

    // Double-check that the user was actually deleted
    console.log('🔍 Verifying deletion by checking if user still exists...');
    const { data: stillExists, error: verifyError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    console.log('📋 Post-deletion verification:', { 
      stillExists, 
      verifyError,
      userWasDeleted: verifyError?.code === 'PGRST116' // "not found" error
    });

    if (deleteError) {
      console.error('❌ Database deletion failed:', deleteError);
      console.error('❌ Error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      });
      return false;
    }

    if (!deleteResult || deleteResult.length === 0) {
      console.error('❌ No rows deleted - user may not be in the group or RLS policy prevented deletion');
      return false;
    }

    console.log('✅ User successfully removed from group:', {
      chatId,
      userId,
      deletedRows: deleteResult.length
    });

    return true;
  } catch (error) {
    console.error('💥 Failed to remove user from group:', error);
    return false;
  }
}

// Create team invitation for email addresses
export const createTeamInvitation = async (
  teamId: string,
  invitedBy: string,
  email: string,
  role: 'admin' | 'member' = 'member'
): Promise<TeamInvitation | null> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      throw new Error('User must be logged in to create invitations')
    }

    // Validate that the team belongs to the user's company
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('company_id')
      .eq('id', teamId)
      .single()

    if (teamError) throw teamError

    if (!validateCompanyAccess(team.company_id)) {
      throw new Error('Access denied: Team does not belong to your company')
    }

    // Check if user with this email already exists in the company
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', team.company_id)
      .single()

    if (existingUser) {
      // User exists, add them directly to the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: existingUser.id,
          role: role
        })

      if (memberError) throw memberError
      return null // No invitation needed, user added directly
    }

    // Create invitation for external user
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        invited_by: invitedBy,
        email: email,
        role: role,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select(`
        *,
        team:teams(*),
        invited_by_user:users(*)
      `)
      .single()

    if (error) throw error

    // Here you would typically send an email invitation
    // For now, we'll just log it
    console.log(`📧 Team invitation sent to ${email} for team ${teamId}`)

    return data
  } catch (error) {
    console.error('Failed to create team invitation:', error)
    return null
  }
}

// Delete a chat (group or direct)
export const deleteChat = async (chatId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting chat:', chatId);
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ No authenticated user');
      return false;
    }

    // Validate chat access and get chat info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        company_id,
        created_by,
        type,
        name,
        chat_participants!inner(user_id)
      `)
      .eq('id', chatId)
      .eq('chat_participants.user_id', currentUser.id)
      .single();

    if (chatError || !chat) {
      console.error('❌ Chat not found or access denied:', chatError);
      return false;
    }

    console.log('📋 Chat to delete:', chat);

    // Validate company access
    if (!validateCompanyAccess(chat.company_id)) {
      console.error('❌ Company access denied');
      return false;
    }

    // For group chats, only the creator can delete
    if (chat.type === 'group') {
      const isCreator = chat.created_by === currentUser.id;
      
      if (!isCreator) {
        console.error('❌ Only group creator can delete group chats');
        return false;
      }
    }

    console.log('✅ Permissions validated, proceeding with deletion...');

    // First, get all message IDs for this chat
    console.log('🔍 Getting message IDs...');
    const { data: messages, error: messagesQueryError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId);

    if (messagesQueryError) {
      console.error('❌ Failed to get message IDs:', messagesQueryError);
    } else {
      console.log('📋 Found messages:', messages?.length || 0);
    }

    // Delete message reactions if there are messages
    if (messages && messages.length > 0) {
      console.log('🧹 Deleting message reactions...');
      const messageIds = messages.map(m => m.id);
      const { error: reactionsError } = await supabase
        .from('message_reactions')
        .delete()
        .in('message_id', messageIds);

      if (reactionsError) {
        console.error('❌ Failed to delete message reactions:', reactionsError);
      } else {
        console.log('✅ Message reactions deleted');
      }
    }

    console.log('🧹 Deleting messages...');
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);

    if (messagesError) {
      console.error('❌ Failed to delete messages:', messagesError);
    } else {
      console.log('✅ Messages deleted');
    }

    console.log('🧹 Deleting chat participants...');
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId);

    if (participantsError) {
      console.error('❌ Failed to delete chat participants:', participantsError);
    } else {
      console.log('✅ Chat participants deleted');
    }

    console.log('🧹 Deleting chat...');
    const { error: chatDeleteError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (chatDeleteError) {
      console.error('❌ Failed to delete chat:', chatDeleteError);
      return false;
    }

    console.log('🎉 Chat deleted successfully!');
    return true;
  } catch (error) {
    console.error('💥 Chat deletion failed:', error);
    return false;
  }
};

export const getGroupAdmin = async (chatId: string): Promise<User | null> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return null
    }

    // Get the chat creator (admin) from the chats table
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        created_by,
        users!chats_created_by_fkey(*)
      `)
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      console.error('Failed to get chat creator:', chatError);
      return null
    }

    return chat.users || null
  } catch (error) {
    console.error('Failed to get group admin:', error)
    return null
  }
}

export const transferGroupAdmin = async (
  chatId: string,
  currentAdminId: string,
  newAdminId: string
): Promise<boolean> => {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser || currentUser.id !== currentAdminId) {
      return false
    }

    // Validate chat access and get chat info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        company_id,
        type,
        created_by,
        chat_participants!inner(user_id)
      `)
      .eq('id', chatId)
      .eq('chat_participants.user_id', currentAdminId)
      .single()

    if (chatError || !chat || !validateCompanyAccess(chat.company_id)) {
      return false
    }

    // Only allow for group chats
    if (chat.type !== 'group') {
      return false
    }

    // Verify current user is the creator (admin)
    if (chat.created_by !== currentAdminId) {
      return false
    }

    // Verify new admin is a member of the group
    const newAdminParticipant = chat.chat_participants.find(p => p.user_id === newAdminId);
    if (!newAdminParticipant) {
      return false
    }

    // Transfer admin privileges by updating the created_by field
    const { error: transferError } = await supabase
      .from('chats')
      .update({ created_by: newAdminId })
      .eq('id', chatId);

    if (transferError) {
      console.error('Failed to transfer admin:', transferError)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to transfer group admin:', error)
    return false
  }
}

export const leaveGroup = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    console.log('🚪 LEAVE GROUP - Starting process for user:', userId, 'in chat:', chatId)

    // First, get the chat and user info for the notification
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      console.error('Failed to validate chat access:', chatError)
      return false
    }

    // Get the user info for the notification
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Failed to get user info:', userError)
      return false
    }

    // Only allow leaving group chats (not direct chats)
    if (chat.type !== 'group') {
      console.error('Cannot leave non-group chat')
      return false
    }

    // Check if user is the creator (admin)
    const isAdmin = chat.created_by === userId;
    console.log('User leaving group:', { userId, isAdmin, chatCreator: chat.created_by });

    // If admin is leaving, we could transfer admin privileges to another user
    // For now, we'll just allow the admin to leave (group will remain without explicit admin)
    if (isAdmin) {
      console.log('Admin is leaving the group');
    }

    // Remove user from group
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to remove user from chat_participants:', error)
      return false
    }

    // Send a system message to notify other group members
    const systemMessage = `${user.name} has left the group`;
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId, // Use the leaving user's ID
        content: systemMessage,
        message_type: 'text',
        is_system: true // Add system flag if your schema supports it
      })

    if (messageError) {
      console.error('Failed to send leave notification message:', messageError)
      // Don't fail the leave operation if message sending fails
    } else {
      console.log('✅ Sent leave notification message to group')
    }

    console.log('✅ User successfully left the group')
    return true
  } catch (error) {
    console.error('Failed to leave group:', error)
    return false
  }
}

// Delete a message
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting message:', messageId);
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ No authenticated user');
      return false;
    }

    // First, verify the user owns the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('sender_id, chat_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('❌ Message not found:', messageError);
      return false;
    }

    if (message.sender_id !== currentUser.id) {
      console.error('❌ Cannot delete message: not the sender');
      return false;
    }

    // Delete message reactions first
    console.log('🧹 Deleting message reactions...');
    const { error: reactionsError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId);

    if (reactionsError) {
      console.error('❌ Failed to delete message reactions:', reactionsError);
    } else {
      console.log('✅ Message reactions deleted');
    }

    // Delete the message
    console.log('🗑️ Deleting message...');
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);

    if (deleteError) {
      console.error('❌ Failed to delete message:', deleteError);
      return false;
    }

    console.log('✅ Message deleted successfully');
    return true;
  } catch (error) {
    console.error('💥 Failed to delete message:', error);
    return false;
  }
};

// Toggle chat archive status
export const toggleChatArchive = async (chatId: string): Promise<boolean> => {
  try {
    console.log('📁 Toggling archive status for chat:', chatId);
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ No authenticated user');
      return false;
    }

    // First, get the current chat to check permissions and current archive status
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('is_archived, company_id, created_by, type')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      console.error('❌ Chat not found:', chatError);
      return false;
    }

    // Validate company access
    if (!validateCompanyAccess(chat.company_id)) {
      console.error('❌ Company access denied');
      return false;
    }

    console.log('📋 Current archive status:', chat.is_archived);

    // Toggle the archive status
    const newArchiveStatus = !chat.is_archived;
    const { error: updateError } = await supabase
      .from('chats')
      .update({ is_archived: newArchiveStatus })
      .eq('id', chatId);

    if (updateError) {
      console.error('❌ Failed to update archive status:', updateError);
      return false;
    }

    console.log('✅ Chat archive status updated:', newArchiveStatus ? 'archived' : 'unarchived');
    return true;
  } catch (error) {
    console.error('💥 Failed to toggle chat archive:', error);
    return false;
  }
}

// Toggle chat mute status
export const toggleChatMute = async (chatId: string): Promise<boolean> => {
  try {
    console.log('🔇 Toggling mute status for chat:', chatId);
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ No authenticated user');
      return false;
    }

    // First, get the current chat to check permissions and current mute status
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('company_id, created_by, type')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      console.error('❌ Chat not found:', chatError);
      return false;
    }

    // Validate company access
    if (!validateCompanyAccess(chat.company_id)) {
      console.error('❌ Company access denied');
      return false;
    }

    // Get current mute status from chat_participants table
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('is_muted')
      .eq('chat_id', chatId)
      .eq('user_id', currentUser.id)
      .single();

    if (participantError || !participant) {
      console.error('❌ Participant not found:', participantError);
      return false;
    }

    console.log('🔇 Current mute status:', participant.is_muted);

    // Toggle the mute status in chat_participants table
    const newMuteStatus = !participant.is_muted;
    const { error: updateError } = await supabase
      .from('chat_participants')
      .update({ is_muted: newMuteStatus })
      .eq('chat_id', chatId)
      .eq('user_id', currentUser.id);

    if (updateError) {
      console.error('❌ Failed to update mute status:', updateError);
      return false;
    }

    console.log('✅ Chat mute status updated:', newMuteStatus ? 'muted' : 'unmuted');
    return true;
  } catch (error) {
    console.error('💥 Failed to toggle chat mute:', error);
    return false;
  }
}
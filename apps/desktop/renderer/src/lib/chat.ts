import { supabase } from './supabase'
import { User } from './auth'

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
  participants?: User[]
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

// Get all teams for a user's company
export const getCompanyTeams = async (companyId: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(*, users(*))
      `)
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(team => ({
      ...team,
      members: team.team_members?.map(member => ({
        ...member,
        user: member.users
      })) || [],
      member_count: team.team_members?.length || 0
    }))
  } catch (error) {
    console.error('Failed to fetch company teams:', error)
    return []
  }
}

// Create a new team
export const createTeam = async (
  creatorId: string,
  companyId: string,
  teamName: string,
  description?: string,
  memberIds: string[] = []
): Promise<Team | null> => {
  try {
    // Ensure creator is in the member list
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]))

    // Create the team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        company_id: companyId,
        name: teamName,
        description: description || '',
        avatar: teamName.substring(0, 2).toUpperCase(),
        created_by: creatorId
      })
      .select()
      .single()

    if (teamError) throw teamError

    // Add team members
    const memberInserts = allMemberIds.map(userId => ({
      team_id: teamData.id,
      user_id: userId,
      role: userId === creatorId ? 'admin' : 'member'
    }))

    const { error: membersError } = await supabase
      .from('team_members')
      .insert(memberInserts)

    if (membersError) throw membersError

    // Fetch the complete team data with members
    const { data: completeTeam, error: fetchError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(*, users(*))
      `)
      .eq('id', teamData.id)
      .single()

    if (fetchError) throw fetchError

    return {
      ...completeTeam,
      members: completeTeam.team_members?.map(member => ({
        ...member,
        user: member.users
      })) || [],
      member_count: completeTeam.team_members?.length || 0
    }
  } catch (error) {
    console.error('Failed to create team:', error)
    return null
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
    // Get team info and members
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(user_id)
      `)
      .eq('id', teamId)
      .single()

    if (teamError) throw teamError

    const participantIds = teamData.team_members?.map(member => member.user_id) || []
    const finalChatName = chatName || `${teamData.name} Chat`

    // Create the chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        company_id: companyId,
        name: finalChatName,
        type: 'team',
        avatar: teamData.avatar,
        created_by: creatorId,
        team_id: teamId
      })
      .select()
      .single()

    if (chatError) throw chatError

    // Add all team members as chat participants
    const participantInserts = participantIds.map(userId => ({
      chat_id: chatData.id,
      user_id: userId
    }))

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts)

    if (participantsError) throw participantsError

    // Fetch the complete chat data with participants
    const { data: completeChat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(*, users(*))
      `)
      .eq('id', chatData.id)
      .single()

    if (fetchError) throw fetchError

    return {
      ...completeChat,
      participants: completeChat.chat_participants?.map(p => p.users).filter(Boolean) || []
    }
  } catch (error) {
    console.error('Failed to create team chat:', error)
    return null
  }
}

// Search teams by name
export const searchTeams = async (companyId: string, searchQuery: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(*, users(*))
      `)
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .ilike('name', `%${searchQuery}%`)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(team => ({
      ...team,
      members: team.team_members?.map(member => ({
        ...member,
        user: member.users
      })) || [],
      member_count: team.team_members?.length || 0
    }))
  } catch (error) {
    console.error('Failed to search teams:', error)
    return []
  }
}

// Get all chats for a user
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!inner(
          user_id,
          is_muted,
          is_pinned,
          users(*)
        )
      `)
      .eq('chat_participants.user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Process the data to get participants and last message
    const chats: Chat[] = []
    for (const chat of data || []) {
      // Get all participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('*, users(*)')
        .eq('chat_id', chat.id)

      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('*, users(*)')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      chats.push({
        ...chat,
        participants: participants?.map(p => p.users).filter(Boolean) || [],
        last_message: lastMessage || undefined
      })
    }

    return chats
  } catch (error) {
    console.error('Failed to fetch user chats:', error)
    return []
  }
}

// Get messages for a chat
export const getChatMessages = async (chatId: string, limit: number = 50): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        users(*),
        message_reactions(*, users(*))
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map(msg => ({
      ...msg,
      sender: msg.users,
      reactions: msg.message_reactions || []
    })).reverse() // Reverse to show oldest first
  } catch (error) {
    console.error('Failed to fetch chat messages:', error)
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
        users(*),
        message_reactions(*, users(*))
      `)
      .single()

    if (error) throw error

    // Update chat's updated_at timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId)

    return {
      ...data,
      sender: data.users,
      reactions: data.message_reactions || []
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    return null
  }
}

// Create a direct chat between two users
export const createDirectChat = async (user1Id: string, user2Id: string, companyId: string): Promise<Chat | null> => {
  try {
    // Check if direct chat already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!inner(user_id)
      `)
      .eq('type', 'direct')
      .eq('company_id', companyId)

    // Find existing direct chat between these users
    const existing = existingChat?.find(chat => {
      const participantIds = chat.chat_participants.map(p => p.user_id)
      return participantIds.includes(user1Id) && participantIds.includes(user2Id) && participantIds.length === 2
    })

    if (existing) {
      return existing as Chat
    }

    // Create new direct chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        company_id: companyId,
        type: 'direct',
        created_by: user1Id
      })
      .select()
      .single()

    if (chatError) throw chatError

    // Add participants
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: user1Id },
        { chat_id: newChat.id, user_id: user2Id }
      ])

    if (participantsError) throw participantsError

    return newChat
  } catch (error) {
    console.error('Failed to create direct chat:', error)
    return null
  }
}

// Add reaction to message
export const addMessageReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: userId,
        emoji
      })

    return !error
  } catch (error) {
    console.error('Failed to add reaction:', error)
    return false
  }
}

// Remove reaction from message
export const removeMessageReaction = async (messageId: string, userId: string, emoji: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)

    return !error
  } catch (error) {
    console.error('Failed to remove reaction:', error)
    return false
  }
}

// Subscribe to real-time messages for a chat
export const subscribeToMessages = (chatId: string, onMessage: (message: Message) => void) => {
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
        // Fetch the complete message with sender info
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            users(*),
            message_reactions(*, users(*))
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          onMessage({
            ...data,
            sender: data.users,
            reactions: data.message_reactions || []
          })
        }
      }
    )
    .subscribe()
}

// Subscribe to user status changes
export const subscribeToUserStatus = (companyId: string, onStatusChange: (user: User) => void) => {
  return supabase
    .channel(`users:${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `company_id=eq.${companyId}`
      },
      (payload) => {
        onStatusChange(payload.new as User)
      }
    )
    .subscribe()
}

// Create a group chat
export const createGroupChat = async (
  creatorId: string, 
  companyId: string, 
  groupName: string, 
  participantIds: string[]
): Promise<Chat | null> => {
  try {
    // Include creator in participants if not already included
    const allParticipantIds = [...new Set([creatorId, ...participantIds])]
    
    // Create new group chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        company_id: companyId,
        name: groupName,
        type: 'group',
        avatar: groupName.charAt(0).toUpperCase(),
        created_by: creatorId
      })
      .select()
      .single()

    if (chatError) throw chatError

    // Add all participants to the chat
    const participantInserts = allParticipantIds.map(userId => ({
      chat_id: newChat.id,
      user_id: userId
    }))

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts)

    if (participantsError) throw participantsError

    // Fetch the complete chat with participants
    const { data: completeChat } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(*, users(*))
      `)
      .eq('id', newChat.id)
      .single()

    if (completeChat) {
      return {
        ...completeChat,
        participants: completeChat.chat_participants?.map(p => p.users).filter(Boolean) || []
      }
    }

    return newChat
  } catch (error) {
    console.error('Failed to create group chat:', error)
    return null
  }
}

// Remove user from group chat
export const removeUserFromGroup = async (
  chatId: string,
  userId: string,
  removedBy: string
): Promise<boolean> => {
  try {
    // Check if the chat is a group chat and if the remover is a participant
    const { data: chat } = await supabase
      .from('chats')
      .select('type, created_by')
      .eq('id', chatId)
      .single()

    if (!chat || chat.type !== 'group') {
      throw new Error('Chat is not a group chat')
    }

    // Check if the person removing is the creator or the user themselves
    if (chat.created_by !== removedBy && userId !== removedBy) {
      throw new Error('Only group creator or the user themselves can remove participants')
    }

    // Remove the user from chat_participants
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) throw error

    // Send a system message about the user being removed (optional)
    await sendMessage(
      chatId,
      removedBy,
      userId === removedBy 
        ? `left the group` 
        : `removed a user from the group`,
      'text'
    )

    return true
  } catch (error) {
    console.error('Failed to remove user from group:', error)
    return false
  }
} 
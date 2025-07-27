import { supabase } from './supabase';

export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  action_type: 'navigate' | 'function';
  action_data: any;
  event_id?: string;
  created_at: string;
}

export interface QuickActionInput {
  name: string;
  icon: string;
  action_type: 'navigate' | 'function';
  action_data: any;
  event_id?: string;
}

// Get all quick actions for the current user
export async function getUserQuickActions(): Promise<QuickAction[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_quick_actions');
    
    if (error) {
      console.error('Error fetching quick actions:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserQuickActions:', error);
    return [];
  }
}

// Add a new quick action
export async function addQuickAction(action: QuickActionInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('add_quick_action', {
      action_name: action.name,
      action_icon: action.icon,
      action_type: action.action_type,
      action_data: action.action_data,
      event_uuid: action.event_id || null
    });
    
    if (error) {
      console.error('Error adding quick action:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in addQuickAction:', error);
    return null;
  }
}

// Remove a quick action
export async function removeQuickAction(actionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('remove_quick_action', {
      action_uuid: actionId
    });
    
    if (error) {
      console.error('Error removing quick action:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in removeQuickAction:', error);
    return false;
  }
}

// Clear all quick actions for the current user
export async function clearUserQuickActions(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('clear_user_quick_actions');
    
    if (error) {
      console.error('Error clearing quick actions:', error);
      throw error;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error in clearUserQuickActions:', error);
    return 0;
  }
}

// Get quick actions for a specific event
export async function getEventQuickActions(eventId: string): Promise<QuickAction[]> {
  try {
    const { data, error } = await supabase.rpc('get_event_quick_actions', {
      event_uuid: eventId
    });
    
    if (error) {
      console.error('Error fetching event quick actions:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getEventQuickActions:', error);
    return [];
  }
}

// Helper function to create a navigation quick action
export function createNavigationQuickAction(
  name: string, 
  icon: string, 
  path: string, 
  eventId?: string
): QuickActionInput {
  return {
    name,
    icon,
    action_type: 'navigate',
    action_data: { path },
    event_id: eventId
  };
}

// Helper function to create a function quick action
export function createFunctionQuickAction(
  name: string, 
  icon: string, 
  functionData: any, 
  eventId?: string
): QuickActionInput {
  return {
    name,
    icon,
    action_type: 'function',
    action_data: functionData,
    event_id: eventId
  };
} 
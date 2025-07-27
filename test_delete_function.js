// DIAGNOSTIC TEST - Run this in browser console to test deletion
// Copy and paste this entire function into your browser console while on Teams Chat page

async function testUserDeletion() {
  console.log('🧪 DIAGNOSTIC TEST - Starting user deletion test...');
  
  try {
    // Get the current supabase instance
    const { supabase } = await import('./lib/supabase');
    
    // First, let's see what's in chat_participants
    console.log('📋 Step 1: Checking current chat_participants...');
    const { data: allParticipants, error: listError } = await supabase
      .from('chat_participants')
      .select('id, chat_id, user_id')
      .limit(5);
    
    console.log('Current participants:', allParticipants, 'Error:', listError);
    
    if (!allParticipants || allParticipants.length === 0) {
      console.log('❌ No participants found - this might be the issue!');
      return;
    }
    
    // Test if we can delete a specific participant
    const testParticipant = allParticipants[0];
    console.log('🎯 Step 2: Testing deletion of participant:', testParticipant);
    
    const { data: deleteResult, error: deleteError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('id', testParticipant.id)
      .select();
    
    console.log('🔄 Delete test result:', { deleteResult, deleteError });
    
    if (deleteError) {
      console.log('❌ Delete failed with error:', deleteError);
    } else if (!deleteResult || deleteResult.length === 0) {
      console.log('❌ Delete returned no results - possibly blocked by RLS or permissions');
    } else {
      console.log('✅ Delete worked! Deleted:', deleteResult);
      
      // Verify it's gone
      const { data: checkGone } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('id', testParticipant.id);
      
      console.log('🔍 Verification - participant still exists?', checkGone);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testUserDeletion(); 
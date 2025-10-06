/**
 * Test data cleanup utilities
 * Cleans up test DATA (portfolios/transactions), not users
 */

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not available');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Clean up all data for a test pool user
 * Deletes portfolios and transactions (cascading) but keeps the user
 */
export async function cleanupUserData(userId: string): Promise<void> {
  const adminClient = getAdminClient();
  
  try {
    // Delete all portfolios (transactions cascade automatically via FK)
    const { error } = await adminClient
      .from('portfolios')
      .delete()
      .eq('user_id', userId);
    
    if (error && error.code !== 'PGRST116') {
      console.error(`Error cleaning up data for user ${userId}:`, error);
    }
  } catch (error) {
    console.error(`Error in cleanupUserData:`, error);
  }
}

/**
 * Clean up all data for test pool users by email
 */
export async function cleanupTestPoolData(email: string): Promise<void> {
  const adminClient = getAdminClient();
  
  try {
    // Get user ID from email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }
    
    const user = users.find((u) => u.email === email);
    
    if (!user) {
      return; // User doesn't exist yet
    }
    
    await cleanupUserData(user.id);
  } catch (error) {
    console.error(`Error cleaning up data for ${email}:`, error);
  }
}

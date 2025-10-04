/**
 * Test cleanup utilities
 * 
 * Provides functions to clean up test data from the database
 * after tests complete to avoid cluttering production/test databases.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase credentials from environment
 */
function getCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('⚠️  Supabase credentials not available. Skipping cleanup.');
    console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
    console.warn('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'set' : 'missing');
    throw new Error('Supabase credentials not available for cleanup');
  }
  
  return { supabaseUrl, serviceRoleKey };
}

/**
 * Create admin client for test cleanup
 */
function getAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getCredentials();
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Check if an email matches test user patterns
 */
function isTestUserEmail(email: string): boolean {
  return email.includes('@testuser.com');
}

/**
 * Find user by email from user list
 */
function findUserByEmail(users: Array<{ email?: string; id: string }>, email: string) {
  return users.find((u) => u.email === email);
}

/**
 * Delete user profile record
 */
async function deleteUserProfile(adminClient: ReturnType<typeof getAdminClient>, userId: string, email: string): Promise<void> {
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
    console.error(`Error deleting profile for ${email}:`, profileError);
  }
}

/**
 * Delete auth user record
 */
async function deleteAuthUser(adminClient: ReturnType<typeof getAdminClient>, userId: string, email: string): Promise<void> {
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    console.error(`Error deleting auth user ${email}:`, authError);
  }
}

/**
 * Delete a user by email (admin operation)
 * Removes both the auth user and user_profiles record
 */
async function deleteTestUser(email: string): Promise<void> {
  if (!isTestUserEmail(email)) {
    console.warn(`⚠️  Skipping deletion of non-test email: ${email}`);
    return;
  }

  const adminClient = getAdminClient();

  try {
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const user = findUserByEmail(users, email);
    
    if (!user) {
      // User might have already been deleted
      return;
    }

    // Delete from user_profiles first (foreign key constraint)
    await deleteUserProfile(adminClient, user.id, email);

    // Delete from auth.users
    await deleteAuthUser(adminClient, user.id, email);
  } catch (error) {
    console.error(`Error cleaning up user ${email}:`, error);
  }
}

/**
 * Delete all test users created today
 * Looks for users with test-related email patterns
 */
export async function deleteAllTestUsers(): Promise<void> {
  const adminClient = getAdminClient();

  try {
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUsers = users.filter((user: any) => 
      user.email && isTestUserEmail(user.email)
    );

    console.log(`🧹 Cleaning up ${testUsers.length} test users...`);

    for (const user of testUsers) {
      if (user.email) {
        await deleteTestUser(user.email);
      }
    }

    console.log(`✅ Cleanup complete`);
  } catch (error) {
    console.error('Error in deleteAllTestUsers:', error);
  }
}

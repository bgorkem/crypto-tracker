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
 * Check if an email matches test user patterns (for deletion)
 * Only matches @testuser.com, NOT @testpool.com (those are permanent)
 */
function isTestUserEmail(email: string): boolean {
  return email.includes('@testuser.com');
}

/**
 * Check if email is a protected test pool user
 */
function isTestPoolUser(email: string): boolean {
  return email.includes('@testpool.com');
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
async function deleteAuthUser(adminClient: ReturnType<typeof getAdminClient>, userId: string, email: string): Promise<boolean> {
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    console.error(`❌ Error deleting auth user ${email}:`, authError);
    return false;
  }
  return true;
}

/**
 * Delete a user by ID (admin operation)
 * Removes both the auth user and user_profiles record
 */
async function deleteTestUserById(adminClient: ReturnType<typeof getAdminClient>, userId: string, email: string): Promise<boolean> {
  try {
    // Delete from user_profiles first (foreign key constraint)
    await deleteUserProfile(adminClient, userId, email);

    // Delete from auth.users
    const success = await deleteAuthUser(adminClient, userId, email);
    return success;
  } catch (error) {
    console.error(`Error cleaning up user ${email}:`, error);
    return false;
  }
}

/**
 * Delete all test users created today
 * Looks for users with @testuser.com pattern
 * IMPORTANT: Does NOT delete @testpool.com users (those are permanent)
 */
// eslint-disable-next-line complexity
export async function deleteAllTestUsers(): Promise<void> {
  const adminClient = getAdminClient();

  try {
    let allDeleted = 0;
    let page = 1;
    const perPage = 1000; // Max users to fetch per request
    
    // Keep fetching and deleting until no more @testuser.com users found
    while (true) {
      console.log(`\n📄 Fetching page ${page}...`);
      
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (error) {
        console.error('Error listing users:', error);
        return;
      }

      if (!users || users.length === 0) {
        console.log('✅ No more users to fetch');
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testUsers = users.filter((user: any) => 
        user.email && isTestUserEmail(user.email)
      );

      if (testUsers.length === 0) {
        console.log(`✅ No @testuser.com users found on page ${page}`);
        break;
      }

      console.log(`🧹 Found ${testUsers.length} @testuser.com users on page ${page}`);
      console.log(`🔒 Protecting @testpool.com users (permanent test pool)`);

      let deleted = 0;
      let failed = 0;
      for (const user of testUsers) {
        if (user.email && user.id) {
          const success = await deleteTestUserById(adminClient, user.id, user.email);
          if (success) {
            deleted++;
            allDeleted++;
          } else {
            failed++;
          }
          
          // Add delay to avoid rate limiting
          if ((deleted + failed) % 10 === 0) {
            console.log(`   Progress: ${deleted} deleted, ${failed} failed out of ${testUsers.length}...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s pause every 10 operations
          }
        }
      }

      console.log(`✅ Page ${page} complete: ${deleted} deleted, ${failed} failed`);
      
      // If we got fewer users than perPage, we've reached the end
      if (users.length < perPage) {
        break;
      }
      
      page++;
      
      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 Total cleanup complete: ${allDeleted} users deleted`);
  } catch (error) {
    console.error('Error in deleteAllTestUsers:', error);
  }
}

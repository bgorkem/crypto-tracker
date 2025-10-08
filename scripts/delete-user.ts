import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: npm run delete-user <user-id>');
  process.exit(1);
}

async function deleteUser() {
  console.log('🗑️  Deleting user:', userId);
  
  // Delete user profile first
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);
  
  if (profileError) {
    console.error('❌ Error deleting profile:', profileError);
  } else {
    console.log('✅ User profile deleted');
  }
  
  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  
  if (authError) {
    console.error('❌ Error deleting auth user:', authError);
  } else {
    console.log('✅ Auth user deleted');
  }
  
  console.log('✨ Done!');
}

deleteUser().catch(console.error);

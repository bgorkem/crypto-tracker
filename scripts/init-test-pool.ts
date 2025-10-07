/**
 * Initialize Test User Pool
 * Creates all test pool users in Supabase
 * Run this once before running tests
 */

import { getAllTestPoolEmails } from '../__tests__/helpers/test-user-pool';

const BASE_URL = 'http://localhost:3000';
const TEST_PASSWORD = 'TestPool123!';

async function initializeTestPool() {
  const emails = getAllTestPoolEmails();
  
  console.log(`🔧 Initializing ${emails.length} test pool users...`);
  
  let created = 0;
  let existing = 0;
  
  for (const email of emails) {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
      }),
    });
    
    const data = await response.json();
    
    if (data.data?.session) {
      console.log(`✅ Created: ${email}`);
      created++;
    } else if (data.error?.code === 'EMAIL_EXISTS') {
      console.log(`⏭️  Already exists: ${email}`);
      existing++;
    } else {
      console.error(`❌ Failed: ${email}`, data.error);
    }
    
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Existing: ${existing}`);
  console.log(`   Total: ${emails.length}`);
  console.log(`\n✅ Test pool ready!`);
}

initializeTestPool().catch(console.error);

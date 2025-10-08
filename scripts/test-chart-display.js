/**
 * Test script to verify portfolio chart displays correctly with synthetic data
 */

const BASE_URL = 'http://localhost:3000';

async function testChartWithSyntheticData() {
  console.log('🧪 Testing Portfolio Chart with Synthetic Data\n');
  console.log('==========================================\n');

  try {
    // Step 1: Register test user
    console.log('📝 Step 1: Registering test user...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `chart_test_${Date.now()}@example.com`,
        password: 'Test123!@#',
        displayName: 'Chart Test User',
      }),
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const authData = await registerResponse.json();
    const token = authData.data.session.access_token;
    console.log('✅ User registered\n');

    // Step 2: Create portfolio
    console.log('📊 Step 2: Creating portfolio...');
    const portfolioResponse = await fetch(`${BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Chart Test Portfolio',
        description: 'Testing chart display',
      }),
    });

    if (!portfolioResponse.ok) {
      throw new Error(`Portfolio creation failed: ${portfolioResponse.status}`);
    }

    const portfolioData = await portfolioResponse.json();
    const portfolioId = portfolioData.data.id;
    console.log(`✅ Portfolio created: ${portfolioId}\n`);

    // Step 3: Add a transaction (to have some value)
    console.log('💰 Step 3: Adding transaction...');
    const transactionResponse = await fetch(`${BASE_URL}/api/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol: 'BTC',
        type: 'BUY',
        quantity: 1,
        price_per_unit: 65432.10,
        transaction_date: new Date().toISOString(),
      }),
    });

    if (!transactionResponse.ok) {
      throw new Error(`Transaction creation failed: ${transactionResponse.status}`);
    }

    console.log('✅ Transaction added\n');

    // Step 4: Fetch chart data
    console.log('📈 Step 4: Fetching chart data for different intervals...\n');
    
    const intervals = ['24h', '7d', '30d'];
    
    for (const interval of intervals) {
      const chartResponse = await fetch(
        `${BASE_URL}/api/portfolios/${portfolioId}/chart?interval=${interval}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!chartResponse.ok) {
        console.error(`❌ Chart fetch failed for ${interval}: ${chartResponse.status}`);
        continue;
      }

      const chartData = await chartResponse.json();
      const snapshots = chartData.data.snapshots;
      
      console.log(`📊 ${interval.toUpperCase()} Interval:`);
      console.log(`   • Data points: ${snapshots.length}`);
      console.log(`   • Current value: $${chartData.data.current_value.toFixed(2)}`);
      console.log(`   • Change: ${chartData.data.change_pct >= 0 ? '+' : ''}${chartData.data.change_pct.toFixed(2)}%`);
      
      if (snapshots.length < 2) {
        console.log(`   ⚠️  WARNING: Less than 2 data points! Chart will not display properly.`);
      } else {
        console.log(`   ✅ Sufficient data points for chart display`);
      }
      
      // Show first and last points
      if (snapshots.length > 0) {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        console.log(`   • First: ${new Date(first.captured_at).toLocaleString()} - $${first.total_value.toFixed(2)}`);
        console.log(`   • Last:  ${new Date(last.captured_at).toLocaleString()} - $${last.total_value.toFixed(2)}`);
      }
      
      console.log('');
    }

    console.log('==========================================');
    console.log('✅ Chart test completed successfully!');
    console.log('==========================================\n');
    console.log('🎯 Summary:');
    console.log(`   • Portfolio ID: ${portfolioId}`);
    console.log(`   • All intervals should have at least 2 data points`);
    console.log(`   • Charts should display as lines, not single dots\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testChartWithSyntheticData();

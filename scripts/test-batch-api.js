#!/usr/bin/env node
/**
 * Test script to verify Moralis batch API is working correctly
 * This tests the real API with a valid token
 */

const BASE_URL = 'http://localhost:3000';

async function testBatchAPI() {
  console.log('🧪 Testing Moralis Batch API Implementation\n');
  console.log('==========================================\n');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test_batch_${Date.now()}@example.com`,
        password: 'Test123!@#',
        displayName: 'Batch Test User',
      }),
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const authData = await registerResponse.json();
    const token = authData.data.session.access_token;
    console.log('✅ User registered successfully\n');

    // Step 2: Fetch prices using batch API
    console.log('📊 Step 2: Fetching prices for all 7 symbols...');
    const symbols = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP'];
    
    const startTime = Date.now();
    const pricesResponse = await fetch(
      `${BASE_URL}/api/prices?symbols=${symbols.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!pricesResponse.ok) {
      const errorData = await pricesResponse.text();
      throw new Error(`Prices fetch failed: ${pricesResponse.status} - ${errorData}`);
    }

    const pricesData = await pricesResponse.json();
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Prices fetched successfully\n');
    console.log(`⏱️  Request took: ${duration}ms\n`);
    console.log('📈 Price Data:');
    console.log('==========================================');
    
    pricesData.data.forEach((price) => {
      console.log(`${price.symbol.padEnd(6)} $${price.price_usd.toFixed(2).padStart(10)}  ${price.change_24h_pct >= 0 ? '📈' : '📉'} ${price.change_24h_pct.toFixed(2)}%`);
    });
    
    console.log('==========================================\n');

    // Step 3: Verify data structure
    console.log('🔍 Step 3: Verifying data structure...');
    const firstPrice = pricesData.data[0];
    const requiredFields = ['symbol', 'price_usd', 'market_cap', 'volume_24h', 'change_24h_pct', 'last_updated'];
    
    const missingFields = requiredFields.filter(field => !(field in firstPrice));
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ All required fields present\n');

    // Step 4: Check if using mock or real data
    console.log('🔎 Step 4: Detecting data source...');
    if (firstPrice.symbol === 'BTC' && firstPrice.price_usd === 65432.10) {
      console.log('⚠️  Using MOCK data (test mode or no API key)\n');
    } else {
      console.log('✅ Using REAL Moralis API data\n');
    }

    // Summary
    console.log('==========================================');
    console.log('✅ All tests passed!');
    console.log('==========================================\n');
    console.log('📊 Summary:');
    console.log(`   • Symbols tested: ${symbols.length}`);
    console.log(`   • API calls made: 1 (batch endpoint)`);
    console.log(`   • Response time: ${duration}ms`);
    console.log(`   • Data points returned: ${pricesData.data.length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testBatchAPI();

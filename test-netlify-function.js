const fs = require('fs');
const path = require('path');
const { handler } = require('./netlify/functions/api');

// Test multiple endpoints
async function testNetlifyFunction() {
  console.log('===== Testing Netlify Function =====');
  
  // Test endpoints to check
  const endpoints = [
    { path: '/.netlify/functions/api/health', method: 'GET', name: 'Health Check' },
    { path: '/.netlify/functions/api/test', method: 'GET', name: 'Server Test' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting ${endpoint.name} endpoint: ${endpoint.method} ${endpoint.path}`);
    
    const mockEvent = {
      path: endpoint.path,
      httpMethod: endpoint.method,
      headers: {},
      body: null,
      isBase64Encoded: false
    };

    const mockContext = {
      awsRequestId: `local-test-${Date.now()}`,
      functionName: 'api',
      getRemainingTimeInMillis: () => 30000
    };

    try {
      const response = await handler(mockEvent, mockContext);
      console.log('Status Code:', response.statusCode);
      console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('Response Body:', response.body);
      console.log(`✅ ${endpoint.name} test successful!`);
    } catch (error) {
      console.error(`❌ Error testing ${endpoint.name}:`, error);
    }
  }
  
  console.log('\n===== Test Run Complete =====');
}

// Run all tests
testNetlifyFunction();
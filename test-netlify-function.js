const fs = require('fs');
const path = require('path');
const { handler } = require('../netlify/functions/api');

// Mock event and context objects for local testing
const mockEvent = {
  path: '/api/health',
  httpMethod: 'GET',
  headers: {},
  body: null,
  isBase64Encoded: false
};

const mockContext = {
  awsRequestId: 'local-test-id',
  functionName: 'api',
  getRemainingTimeInMillis: () => 30000
};

// Test the handler function
handler(mockEvent, mockContext)
  .then(response => {
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', response.body);
    console.log('Test successful!');
  })
  .catch(error => {
    console.error('Error testing handler:', error);
  });
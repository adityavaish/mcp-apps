// Test script for the advanced ApiService with authentication support
import { ApiService } from '../src/services/api-service';

// Test a public API endpoint without authentication
async function testPublicApi() {
  console.log('Testing public API call to JSONPlaceholder...');
  
  const response = await ApiService.callApi({
    endpoint: 'https://jsonplaceholder.typicode.com',
    method: 'GET',
    path: 'posts/1',
    authType: 'none'
  });
  
  console.log('Response:', JSON.stringify(response, null, 2));
  return response.success;
}

// Test error handling with a non-existent endpoint
async function testErrorHandling() {
  console.log('Testing error handling with invalid endpoint...');
  
  const response = await ApiService.callApi({
    endpoint: 'https://this-does-not-exist-12345.example.com',
    method: 'GET',
    path: 'test',
    authType: 'none',
    timeout: 5000 // Short timeout for faster testing
  });
  
  console.log('Error response:', JSON.stringify(response, null, 2));
  return !response.success; // Should return error
}

// Test with Azure Identity (requires environment setup)
async function testAzureIdentity() {
  // This test only runs if environment variables are set
  if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_SECRET) {
    console.log('Skipping Azure Identity test (environment variables not set)');
    return true;
  }
  
  console.log('Testing Azure Identity authentication...');
  
  const response = await ApiService.callApi({
    endpoint: 'https://management.azure.com',
    method: 'GET',
    path: 'subscriptions',
    authType: 'azure-identity',
    authConfig: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID,
      scopes: ['https://management.azure.com/.default']
    }
  });
  
  console.log('Response:', JSON.stringify(response, null, 2));
  return response.success;
}

// Run all tests
async function runTests() {
  try {
    const results = {
      publicApi: await testPublicApi(),
      errorHandling: await testErrorHandling(),
      azureIdentity: await testAzureIdentity()
    };
    
    console.log('------------------------');
    console.log('Test Results:', results);
    
    const allPassed = Object.values(results).every(result => result === true);
    if (allPassed) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();

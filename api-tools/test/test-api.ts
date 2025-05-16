// Simple test script for API Tools
import { ApiService } from '../src/services/simpleApiService';

// Test a public API
async function testApiCall() {
  console.log('Testing API call to JSONPlaceholder...');
  
  const response = await ApiService.callApi({
    endpoint: 'https://jsonplaceholder.typicode.com',
    method: 'GET',
    path: 'posts/1'
  });
  
  console.log('Response:', JSON.stringify(response, null, 2));
}

// Test with basic auth
async function testBasicAuth() {
  console.log('Testing API call with Basic Auth...');
  
  const response = await ApiService.callApi({
    endpoint: 'https://httpbin.org',
    method: 'GET',
    path: 'basic-auth/user/pass',
    authType: 'basic',
    authConfig: {
      username: 'user',
      password: 'pass'
    }
  });
  
  console.log('Response:', JSON.stringify(response, null, 2));
}

// Run tests
async function runTests() {
  try {
    await testApiCall();
    console.log('------------------------');
    await testBasicAuth();
    console.log('------------------------');
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();

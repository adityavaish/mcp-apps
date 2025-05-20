import { ApiService } from '../src/services/api-service';

async function testInteractiveAuth() {
  try {
    console.log('Testing interactive authentication using device code flow...');
    console.log('You will be prompted to visit a URL and enter a code to authenticate.');
    
    const result = await ApiService.callApi({
      endpoint: 'https://graph.microsoft.com',
      method: 'GET',
      path: '/v1.0/me',
      authType: 'interactive',
      authConfig: {
        clientId: 'YOUR_CLIENT_ID', // Replace with your application client ID
        scopes: ['User.Read'], // Microsoft Graph scopes for user profile
        tenantId: 'common' // Use 'common' for multi-tenant apps or your specific tenant ID
      }
    });
    
    if (result.success) {
      console.log('API call succeeded!');
      console.log('Response data:', JSON.stringify(result.data, null, 2));
    } else {
      console.error('API call failed:', result.error);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Only run if executed directly (not imported)
if (require.main === module) {
  testInteractiveAuth()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err));
}

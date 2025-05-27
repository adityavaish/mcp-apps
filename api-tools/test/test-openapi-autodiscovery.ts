console.log('Starting OpenAPI auto-discovery test...');
const { fetchOpenApiSchemaTool } = require('../dist/tools/fetch-openapi-schema');

// Public OpenAPI API for testing - using base URL without schema path
// This will test the auto-discovery feature
const PETSTORE_BASE_URL = 'https://petstore.swagger.io';

// We know the actual schema is at v2/swagger.json, so we add it to our list of endpoints to check
// This will ensure the auto-discovery can find the correct schema

async function testAutoDiscoveryFromBaseUrl() {
    console.log('\n--- Testing OpenAPI Schema Auto-Discovery ---');
    try {
        console.log('Testing auto-discovery with base URL (no schema path)...');
        const result = await fetchOpenApiSchemaTool.handler({
            schemaUrl: PETSTORE_BASE_URL
        });
        
        if (result.isError) {
            console.error('❌ Test failed: Schema auto-discovery failed');
            console.error('Error:', result.content[0].text);
            return;
        }
        
        try {
            const parsedResult = JSON.parse(result.content[0].text);
            console.log('Schema auto-discovery successful!');
            console.log('Schema info:', parsedResult.info);
            console.log('Schema contains', parsedResult.endpoints.length, 'endpoints');
            console.log('✅ Test passed!');
        } catch (parseError) {
            console.error('❌ Test failed: Could not parse result as JSON');
            console.error('Error:', parseError);
            console.error('Result:', result.content[0].text.substring(0, 100) + '...');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testAutoDiscoveryWithNonStandardPath() {
    console.log('\n--- Testing OpenAPI Schema Auto-Discovery with Non-Standard Path ---');
    try {
        // Using a URL with a directory but no schema file
        // Auto-discovery should look in parent path and find /v2/swagger.json
        console.log('Testing auto-discovery with a valid directory path but no direct schema...');
        const result = await fetchOpenApiSchemaTool.handler({
            schemaUrl: `${PETSTORE_BASE_URL}/v2`
        });
        
        if (result.isError) {
            console.error('❌ Test failed: Schema auto-discovery fallback failed');
            console.error('Error:', result.content[0].text);
            return;
        }
        
        try {
            const parsedResult = JSON.parse(result.content[0].text);
            console.log('Schema auto-discovery fallback successful!');
            console.log('Schema info:', parsedResult.info);
            console.log('Schema contains', parsedResult.endpoints.length, 'endpoints');
            console.log('✅ Test passed!');
        } catch (parseError) {
            console.error('❌ Test failed: Could not parse result as JSON');
            console.error('Error:', parseError);
            console.error('Result:', result.content[0].text.substring(0, 100) + '...');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function runTests() {
    console.log('Running OpenAPI Auto-Discovery Tests...');

    await testAutoDiscoveryFromBaseUrl();
    await testAutoDiscoveryWithNonStandardPath();

    console.log('\nAll auto-discovery tests completed!');
}

runTests().catch(console.error);

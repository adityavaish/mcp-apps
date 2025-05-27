import { fetchOpenApiSchemaTool } from '../src/tools/fetch-openapi-schema';
import { getOpenApiEndpointsTool } from '../src/tools/get-openapi-endpoints';
import { getOpenApiOperationsTool } from '../src/tools/get-openapi-operations';
import { getOpenApiOperationDetailsTool } from '../src/tools/get-openapi-operation-details';

// Public OpenAPI API for testing
const PETSTORE_API_URL = 'https://petstore.swagger.io/v2/swagger.json';

async function testFetchOpenApiSchema() {
    console.log('\n--- Testing fetch_openapi_schema tool ---');
    try {
        const result = await fetchOpenApiSchemaTool.handler({
            schemaUrl: PETSTORE_API_URL
        });
        console.log('Schema info:', JSON.parse(result.content[0].text).info);
        console.log('Schema contains', JSON.parse(result.content[0].text).endpoints.length, 'endpoints');
        console.log('✅ Test passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testGetOpenApiEndpoints() {
    console.log('\n--- Testing get_openapi_endpoints tool ---');
    try {
        const result = await getOpenApiEndpointsTool.handler({
            schemaUrl: PETSTORE_API_URL
        });
        const endpoints = JSON.parse(result.content[0].text);
        console.log(`Found ${endpoints.length} endpoints:`);
        endpoints.slice(0, 3).forEach((endpoint: any) => {
            console.log(`- ${endpoint.path} (${endpoint.methods.map((m: any) => m.method).join(', ')})`);
        });
        if (endpoints.length > 3) {
            console.log(`...and ${endpoints.length - 3} more`);
        }
        console.log('✅ Test passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testGetOpenApiOperations() {
    console.log('\n--- Testing get_openapi_operations tool ---');
    try {
        const result = await getOpenApiOperationsTool.handler({
            schemaUrl: PETSTORE_API_URL,
            path: '/pet'
        });
        const operations = JSON.parse(result.content[0].text);
        console.log(`Found ${operations.length} operations for /pet endpoint:`);
        operations.forEach((op: any) => {
            console.log(`- ${op.method} (operationId: ${op.operationId}): ${op.summary}`);
        });
        console.log('✅ Test passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testGetOpenApiOperationDetails() {
    console.log('\n--- Testing get_openapi_operation_details tool ---');
    try {
        const result = await getOpenApiOperationDetailsTool.handler({
            schemaUrl: PETSTORE_API_URL,
            operationId: 'getPetById'
        });
        const details = JSON.parse(result.content[0].text);
        console.log(`Found operation details for '${details.operation.operationId}':`);
        console.log(`- Path: ${details.operation.path}`);
        console.log(`- Method: ${details.operation.method}`);
        console.log(`- Summary: ${details.operation.summary}`);
        console.log('Sample request:');
        console.log(`- URL: ${details.sample.url}`);
        console.log(`- Method: ${details.sample.method}`);
        console.log('✅ Test passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function runTests() {
    console.log('Running OpenAPI tool tests...');

    await testFetchOpenApiSchema();
    await testGetOpenApiEndpoints();
    await testGetOpenApiOperations();
    await testGetOpenApiOperationDetails();

    console.log('\nAll tests completed!');
}

runTests().catch(console.error);

#!import { getPRTestImpactTool } from "../src/tools/get-pr-test-impact";usr/bin/env node

import { getPRTestImpactTool } from '../src/tools/get-pr-test-impact.js';

async function testPRTestImpact() {
    console.log('='.repeat(70));
    console.log('PR TEST IMPACT TOOL - COMPREHENSIVE TEST');
    console.log('='.repeat(70));

    // Test case 1: Basic test impact analysis
    console.log('\n🧪 TEST 1: Basic Test Impact Analysis');
    console.log('─'.repeat(40));
    
    const basicTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'web-app',
        pullRequestId: 456,
        includeTestFiles: true,
        analysisDepth: 'basic' as const
    };

    console.log('Parameters:', JSON.stringify(basicTest, null, 2));
    
    try {
        const result1 = await getPRTestImpactTool.handler(basicTest);
        const response1 = JSON.parse(result1.content[0].text);
        
        console.log('\n✅ Response Structure:');
        console.log(`  - Has error: ${!!response1.error}`);
        console.log(`  - Organization: ${response1.organizationUrl || 'N/A'}`);
        console.log(`  - Project: ${response1.project || 'N/A'}`);
        console.log(`  - Repository: ${response1.repositoryName || 'N/A'}`);
        console.log(`  - PR ID: ${response1.pullRequestId || 'N/A'}`);
        console.log(`  - Analysis Depth: ${response1.analysisDepth || 'N/A'}`);
        console.log(`  - Include Test Files: ${response1.includeTestFiles}`);
        
        if (response1.error) {
            console.log(`  - Error Type: ${response1.error}`);
            console.log(`  - Error Message: ${response1.message}`);
        }
    } catch (error) {
        console.log(`\n❌ Test 1 failed: ${error}`);
    }

    // Test case 2: Standard analysis with test files excluded
    console.log('\n\n🧪 TEST 2: Standard Analysis (No Test Files)');
    console.log('─'.repeat(40));
    
    const standardTest = {
        organizationUrl: 'https://dev.azure.com/myorg',
        project: 'TestProject',
        repositoryName: 'backend-api',
        pullRequestId: 789,
        includeTestFiles: false,
        analysisDepth: 'standard' as const
    };

    console.log('Parameters:', JSON.stringify(standardTest, null, 2));
    
    try {
        const result2 = await getPRTestImpactTool.handler(standardTest);
        const response2 = JSON.parse(result2.content[0].text);
        
        console.log('\n✅ Response for standard analysis:');
        console.log(`  - Has error: ${!!response2.error}`);
        console.log(`  - Analysis Depth: ${response2.analysisDepth || 'N/A'}`);
        console.log(`  - Include Test Files: ${response2.includeTestFiles}`);
        
        if (response2.error) {
            console.log(`  - Error Type: ${response2.error || 'None'}`);
        }
        
        if (response2.testImpactAssessment) {
            console.log('  - Test impact assessment included: ✓');
            console.log(`  - Overall impact: ${response2.testImpactAssessment.overall?.level || 'Unknown'}`);
        }
        
        if (response2.recommendations) {
            console.log(`  - Recommendations count: ${response2.recommendations.length || 0}`);
        }
        
        if (response2.executionPlan) {
            console.log(`  - Execution plan included: ✓`);
            console.log(`  - Estimated duration: ${response2.executionPlan.estimatedDuration || 'N/A'}`);
        }
    } catch (error) {
        console.log(`\n❌ Test 2 failed: ${error}`);
    }

    // Test case 3: Comprehensive analysis
    console.log('\n\n🧪 TEST 3: Comprehensive Analysis');
    console.log('─'.repeat(40));
    
    const comprehensiveTest = {
        organizationUrl: 'https://dev.azure.com/enterprise',
        project: 'CriticalSystem',
        repositoryName: 'core-service',
        pullRequestId: 999,
        includeTestFiles: true,
        analysisDepth: 'comprehensive' as const
    };

    console.log('Parameters:', JSON.stringify(comprehensiveTest, null, 2));
    
    try {
        const result3 = await getPRTestImpactTool.handler(comprehensiveTest);
        const response3 = JSON.parse(result3.content[0].text);
        
        console.log('\n✅ Comprehensive test response:');
        console.log(`  - Has error: ${!!response3.error}`);
        console.log(`  - Repository: ${response3.repositoryName || 'N/A'}`);
        console.log(`  - PR ID: ${response3.pullRequestId || 'N/A'}`);
        console.log(`  - Analysis Depth: ${response3.analysisDepth || 'N/A'}`);
        
        if (response3.testImpactAssessment) {
            console.log('  - Detailed test impact assessment: ✓');
            console.log(`  - Overall impact level: ${response3.testImpactAssessment.overall?.level || 'Unknown'}`);
            console.log(`  - Impact score: ${response3.testImpactAssessment.overall?.score || 'N/A'}`);
        }
        
        if (response3.summary) {
            console.log('  - Summary included: ✓');
        }
    } catch (error) {
        console.log(`\n❌ Test 3 failed: ${error}`);
    }

    // Test case 4: Invalid parameters
    console.log('\n\n🧪 TEST 4: Invalid Parameters');
    console.log('─'.repeat(40));
    
    const invalidTest = {
        organizationUrl: 'invalid-url',
        project: '',
        repositoryName: 'test-repo',
        pullRequestId: -1,
        includeTestFiles: true,
        analysisDepth: 'invalid' as any
    };

    console.log('Parameters:', JSON.stringify(invalidTest, null, 2));
    
    try {
        const result4 = await getPRTestImpactTool.handler(invalidTest);
        const response4 = JSON.parse(result4.content[0].text);
        
        console.log('\n✅ Response for invalid params:');
        console.log(`  - Has error: ${!!response4.error}`);
        console.log(`  - Error Type: ${response4.error || 'None'}`);
        
        if (response4.message) {
            console.log(`  - Error Details: ${response4.message.substring(0, 100)}...`);
        }
    } catch (error) {
        console.log(`\n❌ Test 4 failed: ${error}`);
    }

    // Test case 5: Tool definition validation
    console.log('\n\n🧪 TEST 5: Tool Definition Validation');
    console.log('─'.repeat(40));
    
    console.log('✅ Tool Definition Check:');
    console.log(`  - Name: ${getPRTestImpactTool.name}`);
    console.log(`  - Has description: ${!!getPRTestImpactTool.description}`);
    console.log(`  - Has parameters: ${!!getPRTestImpactTool.parameters}`);
    console.log(`  - Has handler: ${typeof getPRTestImpactTool.handler === 'function'}`);
    
    const parameterKeys = Object.keys(getPRTestImpactTool.parameters);
    console.log(`  - Parameter count: ${parameterKeys.length}`);
    console.log(`  - Parameters: ${parameterKeys.join(', ')}`);
    
    // Check optional parameters
    console.log(`  - Has optional parameters: ${parameterKeys.some(key => 
        getPRTestImpactTool.parameters[key as keyof typeof getPRTestImpactTool.parameters]?.isOptional?.() === true
    )}`);

    console.log('\n' + '='.repeat(70));
    console.log('PR TEST IMPACT TOOL TESTING COMPLETE');
    console.log('='.repeat(70));
}

// Run the comprehensive test
testPRTestImpact().catch(console.error);

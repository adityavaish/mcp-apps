#!import { getRepositoryContextTool } from "../src/tools/get-repository-context";usr/bin/env node

import { getRepositoryContextTool } from '../src/tools/get-repository-context.js';

async function testRepositoryContext() {
    console.log('='.repeat(70));
    console.log('REPOSITORY CONTEXT TOOL - COMPREHENSIVE TEST');
    console.log('='.repeat(70));

    // Test case 1: Basic repository context
    console.log('\n📊 TEST 1: Basic Repository Context');
    console.log('─'.repeat(40));
    
    const basicTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'web-app',
        includeFileStructure: true,
        includeActivity: true,
        activityDays: 30,
        analysisDepth: 'basic' as const
    };

    console.log('Parameters:', JSON.stringify(basicTest, null, 2));
    
    try {
        const result1 = await getRepositoryContextTool.handler(basicTest);
        const response1 = JSON.parse(result1.content[0].text);
        
        console.log('\n✅ Response Structure:');
        console.log(`  - Has error: ${!!response1.error}`);
        console.log(`  - Repository: ${response1.repositoryName || 'N/A'}`);
        console.log(`  - Project: ${response1.projectName || 'N/A'}`);
        console.log(`  - Repository ID: ${response1.repository?.id || 'N/A'}`);
        console.log(`  - Size: ${response1.metadata?.sizeFormatted || 'N/A'}`);
        console.log(`  - Default Branch: ${response1.metadata?.defaultBranch || 'N/A'}`);
        console.log(`  - Total Branches: ${response1.branches?.total || 'N/A'}`);
        console.log(`  - Protected Branches: ${response1.branches?.protectedBranches || 'N/A'}`);
        
        if (response1.fileStructure) {
            console.log(`  - Total Files: ${response1.fileStructure.totalFiles}`);
            console.log(`  - Languages: ${response1.fileStructure.languages?.join(', ') || 'None'}`);
        }
        
        if (response1.activity) {
            console.log(`  - Recent Commits: ${response1.activity.commits?.total || 0}`);
            console.log(`  - Recent PRs: ${response1.activity.pullRequests?.total || 0}`);
        }
        
        if (response1.error) {
            console.log(`  - Error: ${response1.error}`);
        }
        
    } catch (error) {
        console.log(`\n❌ Test 1 failed: ${error}`);
    }

    // Test case 2: Standard analysis
    console.log('\n\n📊 TEST 2: Standard Repository Context');
    console.log('─'.repeat(40));
    
    const standardTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'web-app',
        includeFileStructure: true,
        includeActivity: true,
        activityDays: 30,
        analysisDepth: 'standard' as const
    };

    console.log('Parameters:', JSON.stringify(standardTest, null, 2));
    
    try {
        const result2 = await getRepositoryContextTool.handler(standardTest);
        const response2 = JSON.parse(result2.content[0].text);
        
        console.log('\n✅ Standard Analysis Results:');
        console.log(`  - Repository: ${response2.repositoryName || 'N/A'}`);
        console.log(`  - Analysis Depth: ${response2.options?.analysisDepth || 'N/A'}`);
        
        if (response2.insights && response2.insights.length > 0) {
            console.log(`  - Insights Count: ${response2.insights.length}`);
            response2.insights.slice(0, 3).forEach((insight: string, index: number) => {
                console.log(`    ${index + 1}. ${insight}`);
            });
        }
        
        if (response2.summary) {
            console.log(`  - Repository Type: ${response2.summary.type || 'N/A'}`);
            console.log(`  - Primary Language: ${response2.summary.primaryLanguage || 'N/A'}`);
            console.log(`  - Activity Level: ${response2.summary.activityLevel || 'N/A'}`);
            console.log(`  - Health Status: ${response2.summary.healthStatus || 'N/A'}`);
        }
        
        if (response2.error) {
            console.log(`  - Error: ${response2.error}`);
        }
        
    } catch (error) {
        console.log(`\n❌ Test 2 failed: ${error}`);
    }

    // Test case 3: Comprehensive analysis
    console.log('\n\n📊 TEST 3: Comprehensive Repository Context');
    console.log('─'.repeat(40));
    
    const comprehensiveTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'web-app',
        includeFileStructure: true,
        includeActivity: true,
        activityDays: 60,
        analysisDepth: 'comprehensive' as const
    };

    console.log('Parameters:', JSON.stringify(comprehensiveTest, null, 2));
    
    try {
        const result3 = await getRepositoryContextTool.handler(comprehensiveTest);
        const response3 = JSON.parse(result3.content[0].text);
        
        console.log('\n✅ Comprehensive Analysis Results:');
        console.log(`  - Repository: ${response3.repositoryName || 'N/A'}`);
        console.log(`  - Analysis Depth: ${response3.options?.analysisDepth || 'N/A'}`);
        
        if (response3.comprehensive) {
            console.log(`  - Security Score: ${response3.comprehensive.health?.score || 'N/A'}`);
            console.log(`  - Requires Review: ${response3.comprehensive.security?.requiresReview ? 'Yes' : 'No'}`);
            console.log(`  - Build Validation: ${response3.comprehensive.security?.requiresBuildValidation ? 'Yes' : 'No'}`);
        }
        
        if (response3.summary) {
            console.log(`  - Risk Level: ${response3.summary.riskLevel || 'N/A'}`);
            console.log(`  - Maturity Level: ${response3.summary.maturityLevel || 'N/A'}`);
            
            if (response3.summary.recommendedActions?.length > 0) {
                console.log(`  - Recommended Actions:`);
                response3.summary.recommendedActions.slice(0, 3).forEach((action: string, index: number) => {
                    console.log(`    ${index + 1}. ${action}`);
                });
            }
        }
        
        if (response3.error) {
            console.log(`  - Error: ${response3.error}`);
        }
        
    } catch (error) {
        console.log(`\n❌ Test 3 failed: ${error}`);
    }

    // Test case 4: Minimal analysis
    console.log('\n\n📊 TEST 4: Minimal Repository Context');
    console.log('─'.repeat(40));
    
    const minimalTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'web-app',
        includeFileStructure: false,
        includeActivity: false,
        activityDays: 30,
        analysisDepth: 'basic' as const
    };

    console.log('Parameters:', JSON.stringify(minimalTest, null, 2));
    
    try {
        const result4 = await getRepositoryContextTool.handler(minimalTest);
        const response4 = JSON.parse(result4.content[0].text);
        
        console.log('\n✅ Minimal Analysis Results:');
        console.log(`  - Repository: ${response4.repositoryName || 'N/A'}`);
        console.log(`  - Has File Structure: ${!!response4.fileStructure}`);
        console.log(`  - Has Activity: ${!!response4.activity}`);
        console.log(`  - Has Comprehensive: ${!!response4.comprehensive}`);
        
        if (response4.error) {
            console.log(`  - Error: ${response4.error}`);
        }
        
    } catch (error) {
        console.log(`\n❌ Test 4 failed: ${error}`);
    }

    // Test case 5: Invalid repository
    console.log('\n\n📊 TEST 5: Invalid Repository');
    console.log('─'.repeat(40));
    
    const invalidTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'MyProject',
        repositoryName: 'non-existent-repo',
        includeFileStructure: true,
        includeActivity: true,
        activityDays: 30,
        analysisDepth: 'standard' as const
    };

    console.log('Parameters:', JSON.stringify(invalidTest, null, 2));
    
    try {
        const result5 = await getRepositoryContextTool.handler(invalidTest);
        const response5 = JSON.parse(result5.content[0].text);
        
        console.log('\n✅ Error Handling Results:');
        console.log(`  - Has error: ${!!response5.error}`);
        console.log(`  - Error message: ${response5.message || 'N/A'}`);
        
    } catch (error) {
        console.log(`\n❌ Test 5 failed: ${error}`);
    }

    // Test case 6: Invalid project
    console.log('\n\n📊 TEST 6: Invalid Project');
    console.log('─'.repeat(40));
    
    const invalidProjectTest = {
        organizationUrl: 'https://dev.azure.com/contoso',
        project: 'NonExistentProject',
        repositoryName: 'web-app',
        includeFileStructure: true,
        includeActivity: true,
        activityDays: 30,
        analysisDepth: 'standard' as const
    };

    console.log('Parameters:', JSON.stringify(invalidProjectTest, null, 2));
    
    try {
        const result6 = await getRepositoryContextTool.handler(invalidProjectTest);
        const response6 = JSON.parse(result6.content[0].text);
        
        console.log('\n✅ Error Handling Results:');
        console.log(`  - Has error: ${!!response6.error}`);
        console.log(`  - Error message: ${response6.message || 'N/A'}`);
        
    } catch (error) {
        console.log(`\n❌ Test 6 failed: ${error}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('REPOSITORY CONTEXT TOOL TESTS COMPLETED');
    console.log('='.repeat(70));
}

// Run the test
testRepositoryContext().catch(console.error);

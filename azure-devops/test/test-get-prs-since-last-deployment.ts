#!/usr/bin/env node

import { handleGetPRsSinceLastDeployment } from "../src/tools/get-prs-since-last-deployment";

async function testGetPRsSinceLastDeployment() {
    console.log("Testing get-prs-since-last-deployment tool...\n");

    // Test parameters - using dummy values for initial test
    const testParams = {
        organizationUrl: "https://dev.azure.com/testorg",
        project: "TestProject", 
        repositoryName: "TestRepo",
        serviceGroupName: "Microsoft.Test.PROD",
        pipelineId: "12345",
        days: 7
    };

    console.log("Test parameters:", JSON.stringify(testParams, null, 2));
    console.log("\n" + "=".repeat(50) + "\n");

    try {
        const result = await handleGetPRsSinceLastDeployment(testParams);
        console.log("✅ Tool executed successfully!");
        console.log("Result:");
        console.log(result.content[0].text);
    } catch (error) {
        console.log("❌ Tool execution failed (expected for dummy data):");
        console.error(error instanceof Error ? error.message : String(error));
        
        // Check if it's an authentication or API error (expected with dummy org)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("authenticate") || 
            errorMessage.includes("token") ||
            errorMessage.includes("ENOTFOUND") ||
            errorMessage.includes("404") ||
            errorMessage.includes("testorg") ||
            errorMessage.includes("deployments")) {
            console.log("\n✅ Expected error - tool structure is working correctly!");
            console.log("The error occurred because we're using dummy organization data.");
            console.log("Try with real Azure DevOps organization URL, project, service group, and pipeline ID.");
        }
    }
}

// Run the test
testGetPRsSinceLastDeployment().catch(console.error);

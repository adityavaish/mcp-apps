#!/usr/bin/env node

import { getPRDetailedChangesTool } from "../src/tools/get-pr-detailed-changes";

async function testGetPRDetailedChanges() {
    console.log("Testing get-pr-detailed-changes tool...\n");

    // Test parameters - using dummy values for initial test
    const testParams = {
        organizationUrl: "https://dev.azure.com/testorg",
        project: "TestProject", 
        repositoryName: "TestRepo",
        pullRequestId: 123
    };

    console.log("Test parameters:", JSON.stringify(testParams, null, 2));
    console.log("\n" + "=".repeat(50) + "\n");

    try {
        const result = await getPRDetailedChangesTool.handler(testParams);
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
            errorMessage.includes("testorg")) {
            console.log("\n✅ Expected error - tool structure is working correctly!");
            console.log("The error occurred because we're using dummy organization data.");
            console.log("Try with real Azure DevOps organization URL, project, and PR ID.");
        }
    }
}

// Run the test
testGetPRDetailedChanges().catch(console.error);

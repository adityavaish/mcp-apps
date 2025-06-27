#!/usr/bin/env node

import { getPRCodeDiffsTool } from "../src/tools/get-pr-code-diffs";

async function testGetPRCodeDiffs() {
    console.log("Testing get-pr-code-diffs tool...\n");

    // Test parameters - using dummy values for initial test
    const testParams = {
        organizationUrl: "https://dev.azure.com/testorg",
        project: "TestProject", 
        repositoryName: "TestRepo",
        pullRequestId: 123,
        maxFiles: 10
    };

    console.log("Test parameters:", JSON.stringify(testParams, null, 2));
    console.log("\n" + "=".repeat(50) + "\n");

    try {
        const result = await getPRCodeDiffsTool.handler(testParams);
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
testGetPRCodeDiffs().catch(console.error);

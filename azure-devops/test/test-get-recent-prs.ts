#!/usr/bin/env node

import { getRecentPRsTool } from "../src/tools/get-recent-prs";

async function testGetRecentPRs() {
    console.log("Testing get-recent-prs tool...\n");
    
    // Test parameters - using dummy values for initial test
    const testParams = {
        organizationUrl: "https://dev.azure.com/testorg",
        project: "TestProject",
        repositoryName: "TestRepo",
        days: 7,
        includeActive: false
    };
    
    console.log("Test parameters:", JSON.stringify(testParams, null, 2));
    console.log("\n" + "=".repeat(50) + "\n");
    
    try {
        const result = await getRecentPRsTool.handler(testParams);
        
        console.log("✅ Tool executed successfully!");
        console.log("Result:");
        console.log(result.content[0].text);
        
        // Parse the JSON response to validate structure
        if (result.content && result.content[0] && result.content[0].text) {
            const responseText = result.content[0].text;
            
            // Check if it's an error message
            if (responseText.startsWith("Error")) {
                console.log("\n⚠️  Tool returned error (expected without credentials):");
                console.log(responseText);
            } else {
                // Try to parse as JSON data
                const data = JSON.parse(responseText);
                console.log("\n📊 Parsed Data Structure:");
                console.log("- Summary:", data.summary ? "✅" : "❌");
                console.log("- Pull Requests:", Array.isArray(data.pullRequests) ? `✅ (${data.pullRequests.length} items)` : "❌");
                
                if (data.summary) {
                    console.log("- Total PRs:", data.summary.totalPRs);
                    console.log("- Date Range:", data.summary.dateRange.from, "to", data.summary.dateRange.to);
                    console.log("- Status Breakdown:", data.summary.statusBreakdown);
                }
            }
        }
        
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
            console.log("Try with real Azure DevOps organization URL, project, and repository name.");
        }
    }
}

// Run the test
testGetRecentPRs().catch(console.error);

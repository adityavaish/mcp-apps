import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getPRTestImpactTool = {
    name: "get-pr-test-impact",
    description: `
        Analyzes the test impact and coverage implications of pull request changes.
        
        This tool provides comprehensive analysis of how PR changes affect test coverage,
        identifies potentially untested code paths, and suggests testing strategies.
        
        The analysis includes:
        - Test file coverage analysis
        - Impact on existing test suites
        - Identification of untested code changes
        - Test execution recommendations
        - Code coverage gap analysis
        - Testing strategy suggestions
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/yourorg)
        - project: Project name containing the repository
        - repositoryName: Name of the repository
        - pullRequestId: ID of the pull request to analyze
        - includeTestFiles: Whether to include analysis of test file changes (default: true)
        - analysisDepth: Level of analysis depth - 'basic', 'standard', or 'comprehensive' (default: 'standard')
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        includeTestFiles: z.boolean().default(true).describe("Include test file analysis"),
        analysisDepth: z.enum(["basic", "standard", "comprehensive"]).default("standard").describe("Analysis depth level")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName, 
        pullRequestId,
        includeTestFiles,
        analysisDepth 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        includeTestFiles: boolean;
        analysisDepth: "basic" | "standard" | "comprehensive";
    }) => {
        try {
            const service = new AzureDevOpsService();
            const testImpact = await service.getPRTestImpact(
                organizationUrl,
                project, 
                repositoryName,
                pullRequestId,
                { includeTestFiles, analysisDepth }
            );

            return JSON.stringify(testImpact, null, 2);
        } catch (error) {
            throw new Error(`Error analyzing PR test impact: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

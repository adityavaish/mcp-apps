import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getPRDetailedChangesTool = {
    name: "get-pr-detailed-changes",
    description: `
        Retrieves detailed file changes for a specific pull request.
        
        This tool provides comprehensive information about all files modified in a PR,
        including additions, deletions, modifications, and file categorization for risk analysis.
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL
        - project: Project name containing the repository
        - repositoryName: Name of the repository
        - pullRequestId: ID of the pull request to analyze
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName, 
        pullRequestId 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
    }) => {
        try {
            const service = new AzureDevOpsService();
            const changes = await service.getPRChanges(
                organizationUrl,
                project, 
                repositoryName,
                pullRequestId
            );

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(changes, null, 2)
                }]
            };
        } catch (error) {
            throw new Error(`Error retrieving PR detailed changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

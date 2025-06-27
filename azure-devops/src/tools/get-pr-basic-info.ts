import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getPRBasicInfoTool = {
    name: "get-pr-basic-info",
    description: `
        Retrieves basic information about a specific pull request.
        
        This tool fetches essential PR metadata including title, description, author,
        reviewers, status, and basic statistics for risk analysis.
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/organization)
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
            const basicInfo = await service.getPRBasicInfo(
                organizationUrl,
                project, 
                repositoryName,
                pullRequestId
            );

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(basicInfo, null, 2)
                }]
            };
        } catch (error) {
            throw new Error(`Error retrieving PR basic info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

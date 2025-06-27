import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getRecentPRsTool = {
    name: "get-recent-prs",
    description: `
        Retrieves pull requests completed within the specified number of days for risk analysis.
        
        This tool fetches recently completed PRs from an Azure DevOps repository to enable
        risk assessment based on recent deployment activities.
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/organization)
        - project: Project name containing the repository
        - repositoryName: Name of the repository to analyze
        - days: Number of days back to look for completed PRs (default: 7)
        - includeActive: Whether to include active (not yet completed) PRs (default: false)
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        days: z.number().int().min(1).max(365).default(7).describe("Number of days to look back"),
        includeActive: z.boolean().default(false).describe("Include active/open PRs")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName, 
        days,
        includeActive 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        days: number;
        includeActive: boolean;
    }) => {
        try {
            const service = new AzureDevOpsService();
            const result = await service.getPullRequests(
                organizationUrl,
                project, 
                repositoryName,
                days,
                includeActive
            );

            return JSON.stringify(result, null, 2);
        } catch (error) {
            throw new Error(`Error retrieving recent PRs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

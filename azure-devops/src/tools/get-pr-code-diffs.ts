import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getPRCodeDiffsTool = {
    name: "get-pr-code-diffs",
    description: `
        Retrieves actual code diffs for files in a pull request.
        
        This tool provides line-by-line diff information for code changes
        to enable detailed risk analysis of modifications.
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL
        - project: Project name containing the repository
        - repositoryName: Name of the repository
        - pullRequestId: ID of the pull request to analyze
        - maxFiles: Maximum number of files to analyze (default: 50)
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        maxFiles: z.number().int().default(50).describe("Maximum files to analyze")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName, 
        pullRequestId,
        maxFiles 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        maxFiles: number;
    }) => {
        try {
            const service = new AzureDevOpsService();
            const diffs = await service.getPRDiffs(
                organizationUrl,
                project, 
                repositoryName,
                pullRequestId,
                maxFiles
            );

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(diffs, null, 2)
                }]
            };
        } catch (error) {
            throw new Error(`Error retrieving PR code diffs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getPRsSinceLastDeploymentTool = {
    name: "get-prs-since-last-deployment",
    description: `
        Retrieves pull requests merged to master since the last successful deployment to production.
        
        This tool:
        1. Gets rollouts from EV2 deployment API from the past week
        2. Finds the latest successful deployment and its artifact version
        3. Gets the corresponding build in Azure DevOps
        4. Determines the commit SHA of that build
        5. Finds the commit date to master branch
        6. Lists all PRs that were merged after that commit date
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/organization)
        - project: Project name containing the repository
        - repositoryName: Name of the repository
        - serviceGroupName: EV2 service group name (e.g., "Microsoft.CFS.MACC.PROD")
        - pipelineId: ID of the build pipeline (e.g., "135558")
        - days: Number of days to look back for deployments (default: 7)
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        serviceGroupName: z.string().describe("EV2 service group name"),
        pipelineId: z.string().describe("ID of the build pipeline"),
        days: z.number().int().min(1).max(365).default(7).describe("Number of days to look back for deployments")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName,
        serviceGroupName,
        pipelineId,
        days 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        serviceGroupName: string;
        pipelineId: string;
        days: number;
    }) => {
        try {
            const service = new AzureDevOpsService();
            const result = await service.getPRsSinceLastDeployment(
                organizationUrl,
                project, 
                repositoryName,
                serviceGroupName,
                pipelineId,
                days
            );

            return JSON.stringify(result, null, 2);
        } catch (error) {
            throw new Error(`Error retrieving PRs since last deployment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

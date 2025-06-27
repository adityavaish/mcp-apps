import { z } from "zod";
import { AzureDevOpsService } from "../services/azure-devops-service.js";

export const getRepositoryContextTool = {
    name: "get-repository-context",
    description: `
        Provides comprehensive repository context information for better understanding of the codebase.
        
        This tool analyzes repository structure, metadata, recent activity, and development patterns
        to provide valuable context for code reviews, risk assessment, and project understanding.
        
        The analysis includes:
        - Repository metadata and statistics
        - File structure and organization
        - Language and framework analysis
        - Recent activity patterns
        - Development team insights
        - Branch and release information
        - Code quality indicators
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/yourorg)
        - project: Project name containing the repository
        - repositoryName: Name of the repository to analyze
        - includeFileStructure: Whether to include detailed file structure analysis (default: true)
        - includeActivity: Whether to include recent activity analysis (default: true)
        - activityDays: Number of days to analyze for activity patterns (default: 30)
        - analysisDepth: Level of analysis depth - 'basic', 'standard', or 'comprehensive' (default: 'standard')
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        includeFileStructure: z.boolean().default(true).describe("Include file structure analysis"),
        includeActivity: z.boolean().default(true).describe("Include activity analysis"),
        activityDays: z.number().int().min(1).max(365).default(30).describe("Days to analyze for activity"),
        analysisDepth: z.enum(["basic", "standard", "comprehensive"]).default("standard").describe("Analysis depth level")
    },
    handler: async ({ 
        organizationUrl, 
        project, 
        repositoryName,
        includeFileStructure,
        includeActivity,
        activityDays,
        analysisDepth 
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        includeFileStructure: boolean;
        includeActivity: boolean;
        activityDays: number;
        analysisDepth: "basic" | "standard" | "comprehensive";
    }) => {
        try {
            const service = new AzureDevOpsService();
            const context = await service.getRepositoryContext(
                organizationUrl,
                project, 
                repositoryName,
                { 
                    includeFileStructure,
                    includeActivity,
                    activityDays,
                    analysisDepth 
                }
            );

            return JSON.stringify(context, null, 2);
        } catch (error) {
            throw new Error(`Error retrieving repository context: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

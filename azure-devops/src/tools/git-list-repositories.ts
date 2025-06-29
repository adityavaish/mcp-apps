import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";

// Tool to list repositories
export const listRepositoriesTool = {
    name: "git-list-repositories",
    description: `
        Lists all Git repositories available in an Azure DevOps project.
        
        This tool retrieves information about all repositories within the specified project,
        including their names, IDs, URLs, and other metadata.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project to list repositories from
          Example: "FabrikamFiber"
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
    },
    handler: async ({ organizationUrl, project }: {
        organizationUrl: string;
        project: string;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);
            const repositories = await gitApi.getRepositories(project);

            if (!repositories || repositories.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No repositories found in project ${project}.` }],
                };
            }

            return {
                content: [{ type: "text" as const, text: JSON.stringify(repositories, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing repositories:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing repositories: ${errorMessage}` }],
            };
        }
    }
};

import { z } from "zod";
import { getCoreApi } from "../utils/azure-devops-client";

// Tool to list projects
export const listProjectsTool = {
    name: "list-projects",
    description: `
        Lists all projects available in an Azure DevOps organization.
        
        This tool retrieves a comprehensive list of all projects within the specified Azure DevOps
        organization, including their names, IDs, descriptions, and other metadata.
        
        The organization URL must be in the format: https://dev.azure.com/{organization}
        Example: https://dev.azure.com/fabrikam
        
        Use this tool to:
        - Get an overview of all projects in your organization
        - Find specific project details like IDs needed for other operations
        - Check project visibility, state, and last update time
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
    },
    handler: async ({ organizationUrl }: {
        organizationUrl: string;
    }) => {
        try {
            const coreApi = await getCoreApi(organizationUrl);

            const projects = await coreApi.getProjects();

            if (!projects || projects.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No projects found in the organization." }],
                };
            }

            return {
                content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing projects:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing projects: ${errorMessage}` }],
            };
        }
    }
};

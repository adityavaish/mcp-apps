import { z } from "zod";
import { getWorkItemTrackingApi } from "../utils/azure-devops-client";

// Tool to list work items
export const listWorkItemsTool = {
    name: "list-work-items",
    description: `
        List work items in Azure DevOps.
        
        This tool accepts a WIQL query to filter work items. WIQL (Work Item Query Language) is 
        similar to SQL and allows querying work items based on their fields.
        
        If you have a work item URL like 'https://dev.azure.com/{organization}/{project}/_workitems/edit/{id}', 
        you can extract the work item ID from the URL and use it in a query like:
        'SELECT [System.Id] FROM workitems WHERE [System.Id] = {id}'
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        query: z.string().describe("Work item query (e.g., SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'Bug')"),
    },
    handler: async ({ organizationUrl, project, query }: {
        organizationUrl: string;
        project: string;
        query: string;
    }) => {
        try {
            const witApi = await getWorkItemTrackingApi(organizationUrl);

            // Execute the query
            const queryResult = await witApi.queryByWiql({ query }, { project }, false, 10);

            if (!queryResult || !queryResult.workItems || queryResult.workItems.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No work items found matching the query." }],
                };
            }

            const workItemIds = queryResult.workItems.map((wi) => wi.id!).filter((id): id is number => id !== undefined);
            const workItems = await witApi.getWorkItems(workItemIds);
            const formattedItems = workItems.map((item) => {
                const fields = item.fields || {};
                return {
                    id: item.id,
                    type: fields["System.WorkItemType"] as string || "Unknown",
                    title: fields["System.Title"] as string || "No Title",
                    state: fields["System.State"] as string || "Unknown",
                    description: fields["System.Description"] as string || "No Description",
                    createdBy: (fields["System.CreatedBy"] as { displayName?: string } | undefined)?.displayName || "Unknown",
                    assignedTo: (fields["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName || "Unassigned",
                    url: item._links?.html?.href || `https://dev.azure.com/${organizationUrl.split("/")[3]}/${project}/_workitems/edit/${item.id}`,
                };
            });

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedItems, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing work items:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing work items: ${errorMessage}` }],
            };
        }
    }
};

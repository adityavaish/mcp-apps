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

// Tool to create a work item
export const createWorkItemTool = {
    name: "create-work-item",
    description: `
        Creates a new work item in an Azure DevOps project. If the fields are required, they must be provided.
        Confirm with the user if any of the required fields are missing.

        Parameters:
        - organizationUrl [Required]: Azure DevOps URL (https://dev.azure.com/{organization})
        - project [Required]: Project name (case-sensitive)
        - areaPath: [Required] Area path (e.g., TeamProject\\Area) - case-sensitive
        - iterationPath: [Required] Iteration path (e.g., TeamProject\\Iteration) - case-sensitive
        - workItemType [Required]: Type of work item (Bug, Task, User Story, etc.) - case-sensitive
        - title [Required]: Title of the work item
        - description [Optional]: Detailed description (supports HTML)
        - assignedTo [Optional]: User email or display name

        Make sure to provide link to the user in appropriate format.
        `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        areaPath: z.string().describe("Area path (e.g., TeamProject\\Area)"),
        iterationPath: z.string().describe("Iteration path (e.g., TeamProject\\Iteration)"),
        workItemType: z.string().describe("Work item type (e.g., Bug, Task, User Story)"),
        title: z.string().describe("Work item title"),
        description: z.string().optional().describe("Work item description"),
        assignedTo: z.string().optional().describe("User to assign the work item to"),
    },
    handler: async ({ organizationUrl, project, areaPath, iterationPath, workItemType, title, description, assignedTo }: {
        organizationUrl: string;
        project: string;
        areaPath: string;
        iterationPath: string;
        workItemType: string;
        title: string;
        description?: string;
        assignedTo?: string;
    }) => {
        try {
            const witApi = await getWorkItemTrackingApi(organizationUrl);
            const patchDocument = [
                {
                    op: "add",
                    path: "/fields/System.Title",
                    value: title,
                },
            ];

            if (description) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.Description",
                    value: description,
                });
            }

            if (assignedTo) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.AssignedTo",
                    value: assignedTo,
                });
            }

            if (areaPath) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.AreaPath",
                    value: areaPath,
                });
            }

            if (iterationPath) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.IterationPath",
                    value: iterationPath,
                });
            }

            patchDocument.push({
                op: "add",
                path: "/fields/System.Tag",
                value: "Created by AI",
            });

            // Create the work item
            const createdWorkItem = await witApi.createWorkItem(
                null,
                patchDocument,
                project,
                workItemType
            );

            const fields = createdWorkItem.fields || {};
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Work item created successfully:\nID: ${createdWorkItem.id}\nTitle: ${fields["System.Title"] as string || workItemType}\nType: ${workItemType}\nURL: ${createdWorkItem._links?.html?.href || ""}`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error creating work item:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error creating work item: ${errorMessage}` }],
            };
        }
    }
};

// Tool to update a work item
export const updateWorkItemTool = {
    name: "update-work-item",
    description: `
        Updates an existing work item in Azure DevOps.
        
        Parameters:
        - organizationUrl [Required]: Azure DevOps URL (https://dev.azure.com/{organization})
        - project [Required]: Project name (case-sensitive)
        - id [Required]: Work item ID to update
        - title [Optional]: Updated work item title
        - description [Optional]: Updated work item description
        - state [Optional]: Updated work item state (e.g., Active, Resolved, Closed)
        - assignedTo [Optional]: User email or display name to assign the work item to
        - areaPath [Optional]: Updated area path
        - iterationPath [Optional]: Updated iteration path
        
        Specify only the fields you want to update. At least one field other than organizationUrl, 
        project, and id must be provided.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        id: z.number().describe("Work item ID to update"),
        title: z.string().optional().describe("Updated work item title"),
        description: z.string().optional().describe("Updated work item description"),
        state: z.string().optional().describe("Updated work item state (e.g., Active, Resolved, Closed)"),
        assignedTo: z.string().optional().describe("User to assign the work item to"),
        areaPath: z.string().optional().describe("Updated area path"),
        iterationPath: z.string().optional().describe("Updated iteration path"),
    },
    handler: async ({ organizationUrl, project, id, title, description, state, assignedTo, areaPath, iterationPath }: {
        organizationUrl: string;
        project: string;
        id: number;
        title?: string;
        description?: string;
        state?: string;
        assignedTo?: string;
        areaPath?: string;
        iterationPath?: string;
    }) => {
        try {
            // Ensure at least one update field is provided
            if (!title && !description && !state && !assignedTo && !areaPath && !iterationPath) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: "Error: At least one field to update must be provided (title, description, state, assignedTo, areaPath, or iterationPath)." 
                    }],
                };
            }

            const witApi = await getWorkItemTrackingApi(organizationUrl);
            const patchDocument = [];

            if (title) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.Title",
                    value: title,
                });
            }

            if (description) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.Description",
                    value: description,
                });
            }

            if (state) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.State",
                    value: state,
                });
            }

            if (assignedTo) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.AssignedTo",
                    value: assignedTo,
                });
            }

            if (areaPath) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.AreaPath",
                    value: areaPath,
                });
            }

            if (iterationPath) {
                patchDocument.push({
                    op: "add",
                    path: "/fields/System.IterationPath",
                    value: iterationPath,
                });
            }

            patchDocument.push({
                op: "add",
                path: "/fields/System.ChangedBy",
                value: "Updated by AI",
            });

            // Update the work item
            const updatedWorkItem = await witApi.updateWorkItem(
                null,
                patchDocument,
                id,
                project
            );

            const fields = updatedWorkItem.fields || {};
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Work item updated successfully:\nID: ${updatedWorkItem.id}\nTitle: ${fields["System.Title"] as string || "Unknown"}\nState: ${fields["System.State"] as string || "Unknown"}\nURL: ${updatedWorkItem._links?.html?.href || ""}`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error updating work item:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error updating work item: ${errorMessage}` }],
            };
        }
    }
};

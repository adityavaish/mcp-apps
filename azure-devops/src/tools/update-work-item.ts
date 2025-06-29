import { z } from "zod";
import { getWorkItemTrackingApi } from "../utils/azure-devops-client";

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

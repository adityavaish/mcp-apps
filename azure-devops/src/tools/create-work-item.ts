import { z } from "zod";
import { getWorkItemTrackingApi } from "../utils/azure-devops-client";

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
                path: "/fields/System.Tags",
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

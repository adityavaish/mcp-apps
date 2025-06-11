import { z } from "zod";
import { getWorkItemTrackingApi } from "../utils/azure-devops-client";

// Tool to query test cases
export const queryTestCasesTool = {
    name: "query-test-cases",
    description: `
        Query test cases in an Azure DevOps project using WIQL (Work Item Query Language).
        
        This tool allows you to search for test cases based on various criteria or return all test cases
        in a project. You can provide a custom WIQL query for advanced filtering.
        
        Example queries:
        - All test cases: Leave query parameter empty
        - Test cases in specific area: SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'Test Case' AND [System.AreaPath] UNDER 'ProjectName\\AreaName'
        - Test cases by state: SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'Test Case' AND [System.State] = 'Active'
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        projectName: z.string().describe("Name of the Azure DevOps project"),
        query: z.string().optional().describe("Optional WIQL query to filter test cases. If not provided, returns all test cases in the project"),
        top: z.number().optional().default(100).describe("Maximum number of test cases to return (default: 100)")
    },
    handler: async ({ organizationUrl, projectName, query, top }: {
        organizationUrl: string;
        projectName: string;
        query?: string;
        top?: number;
    }) => {
        try {
            const witApi = await getWorkItemTrackingApi(organizationUrl);
            
            // Default query to get all test cases if no custom query provided
            const wiqlQuery = query || `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.CreatedDate] FROM WorkItems WHERE [System.WorkItemType] = 'Test Case' AND [System.TeamProject] = '${projectName}' ORDER BY [System.Id] DESC`;
            
            const queryResult = await witApi.queryByWiql({
                query: wiqlQuery
            }, { project: projectName }, false, top || 100);

            if (!queryResult.workItems || queryResult.workItems.length === 0) {
                return {
                    content: [{
                        type: "text" as const,
                        text: "No test cases found matching the specified criteria."
                    }]
                };
            }

            // Get work item IDs
            const workItemIds = queryResult.workItems.map(wi => wi.id!).filter((id): id is number => id !== undefined);
            
            // Get detailed information for the work items
            const workItems = await witApi.getWorkItems(workItemIds);

            const testCases = workItems.map(wi => ({
                id: wi.id,
                title: wi.fields!["System.Title"] as string,
                state: wi.fields!["System.State"] as string,
                assignedTo: (wi.fields!["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName || "Unassigned",
                createdDate: wi.fields!["System.CreatedDate"] as string,
                priority: wi.fields!["Microsoft.VSTS.Common.Priority"] as string || "Not set",
                areaPath: wi.fields!["System.AreaPath"] as string,
                iterationPath: wi.fields!["System.IterationPath"] as string,
                tags: wi.fields!["System.Tags"] as string || ""
            }));

            return {
                content: [{
                    type: "text" as const,
                    text: `Found ${testCases.length} test case(s):\n\n` +
                        testCases.map(tc => 
                            `**Test Case #${tc.id}**: ${tc.title}\n` +
                            `- State: ${tc.state}\n` +
                            `- Assigned To: ${tc.assignedTo}\n` +
                            `- Priority: ${tc.priority}\n` +
                            `- Area: ${tc.areaPath}\n` +
                            `- Iteration: ${tc.iterationPath}\n` +
                            `- Tags: ${tc.tags}\n` +
                            `- Created: ${new Date(tc.createdDate).toLocaleDateString()}\n`
                        ).join('\n')
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text" as const,
                    text: `Error querying test cases: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }
};

// Tool to get test case details
export const getTestCaseDetailsTool = {
    name: "get-test-case-details",
    description: `
        Get detailed information about a specific test case including steps and fields.
        
        This tool retrieves comprehensive information about a test case including:
        - Basic metadata (title, description, state, assigned to, etc.)
        - Test steps with actions and expected results
        - Priority, area path, iteration path
        - Automation status and other test-specific fields
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        projectName: z.string().describe("Name of the Azure DevOps project"),
        testCaseId: z.number().describe("ID of the test case to retrieve")
    },
    handler: async ({ organizationUrl, projectName, testCaseId }: {
        organizationUrl: string;
        projectName: string;
        testCaseId: number;
    }) => {
        try {
            const witApi = await getWorkItemTrackingApi(organizationUrl);
            
            const workItem = await witApi.getWorkItem(testCaseId);
            
            if (!workItem || workItem.fields!["System.WorkItemType"] !== "Test Case") {
                return {
                    content: [{
                        type: "text" as const,
                        text: `Test case with ID ${testCaseId} not found or is not a test case work item.`
                    }]
                };
            }

            const fields = workItem.fields!;
            
            // Parse test steps from the Steps field (XML format)
            let testSteps = "No test steps defined";
            if (fields["Microsoft.VSTS.TCM.Steps"]) {
                try {
                    const stepsXml = fields["Microsoft.VSTS.TCM.Steps"] as string;
                    // Simple regex to extract steps from XML (basic parsing)
                    const stepMatches = stepsXml.match(/<step[^>]*>.*?<\/step>/g);
                    if (stepMatches) {
                        testSteps = stepMatches.map((step: string, index: number) => {
                            const actionMatch = step.match(/<parameterizedString[^>]*isformatted="true"[^>]*>(.*?)<\/parameterizedString>/);
                            const expectedMatch = step.match(/<parameterizedString[^>]*isformatted="true"[^>]*>.*?<parameterizedString[^>]*isformatted="true"[^>]*>(.*?)<\/parameterizedString>/);
                            
                            const action = actionMatch ? actionMatch[1].replace(/<[^>]*>/g, '').trim() : 'Action not specified';
                            const expected = expectedMatch ? expectedMatch[1].replace(/<[^>]*>/g, '').trim() : 'Expected result not specified';
                            
                            return `${index + 1}. **Action**: ${action}\n   **Expected**: ${expected}`;
                        }).join('\n\n');
                    }
                } catch (e) {
                    testSteps = "Error parsing test steps";
                }
            }

            const testCaseDetails = {
                id: workItem.id,
                title: fields["System.Title"] as string,
                description: fields["System.Description"] as string || "No description provided",
                state: fields["System.State"] as string,
                assignedTo: (fields["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName || "Unassigned",
                createdBy: (fields["System.CreatedBy"] as { displayName?: string } | undefined)?.displayName || "Unknown",
                createdDate: fields["System.CreatedDate"] as string,
                changedDate: fields["System.ChangedDate"] as string,
                priority: fields["Microsoft.VSTS.Common.Priority"] as string || "Not set",
                areaPath: fields["System.AreaPath"] as string,
                iterationPath: fields["System.IterationPath"] as string,
                tags: fields["System.Tags"] as string || "No tags",
                testSteps: testSteps,
                automationStatus: fields["Microsoft.VSTS.TCM.AutomationStatus"] as string || "Not automated"
            };

            return {
                content: [{
                    type: "text" as const,
                    text: `**Test Case #${testCaseDetails.id}**: ${testCaseDetails.title}\n\n` +
                        `**Description**: ${testCaseDetails.description}\n\n` +
                        `**Details**:\n` +
                        `- State: ${testCaseDetails.state}\n` +
                        `- Assigned To: ${testCaseDetails.assignedTo}\n` +
                        `- Created By: ${testCaseDetails.createdBy}\n` +
                        `- Priority: ${testCaseDetails.priority}\n` +
                        `- Area Path: ${testCaseDetails.areaPath}\n` +
                        `- Iteration Path: ${testCaseDetails.iterationPath}\n` +
                        `- Tags: ${testCaseDetails.tags}\n` +
                        `- Automation Status: ${testCaseDetails.automationStatus}\n` +
                        `- Created: ${new Date(testCaseDetails.createdDate).toLocaleDateString()}\n` +
                        `- Last Changed: ${new Date(testCaseDetails.changedDate).toLocaleDateString()}\n\n` +
                        `**Test Steps**:\n${testCaseDetails.testSteps}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text" as const,
                    text: `Error retrieving test case details: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }
};

// Tool to create test cases
export const createTestCaseTool = {
    name: "create-test-case",
    description: `
        Create a new test case in Azure DevOps with steps and metadata.
        
        This tool allows you to create comprehensive test cases with:
        - Title and description
        - Test steps with actions and expected results
        - Priority, area path, iteration path
        - Tags for categorization
        
        The test case will be created with proper XML formatting for test steps.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        projectName: z.string().describe("Name of the Azure DevOps project"),
        title: z.string().describe("Title of the test case"),
        description: z.string().optional().describe("Description of the test case"),
        steps: z.array(z.object({
            action: z.string().describe("Action to perform in this step"),
            expectedResult: z.string().describe("Expected result for this step")
        })).optional().describe("Test steps with actions and expected results"),
        priority: z.number().optional().default(2).describe("Priority level (1=High, 2=Normal, 3=Low)"),
        areaPath: z.string().optional().describe("Area path for the test case"),
        iterationPath: z.string().optional().describe("Iteration path for the test case"),
        tags: z.string().optional().describe("Comma-separated tags for the test case")
    },
    handler: async ({ organizationUrl, projectName, title, description, steps, priority, areaPath, iterationPath, tags }: {
        organizationUrl: string;
        projectName: string;
        title: string;
        description?: string;
        steps?: Array<{ action: string; expectedResult: string }>;
        priority?: number;
        areaPath?: string;
        iterationPath?: string;
        tags?: string;
    }) => {
        try {
            const witApi = await getWorkItemTrackingApi(organizationUrl);
            
            // Build the test steps XML format
            let stepsXml = "";
            if (steps && steps.length > 0) {
                const stepsContent = steps.map((step, index) => {
                    return `<step id="${index + 1}" type="ValidateStep">
                        <parameterizedString isformatted="true">${step.action}</parameterizedString>
                        <parameterizedString isformatted="true">${step.expectedResult}</parameterizedString>
                        <description/>
                    </step>`;
                }).join('');
                
                stepsXml = `<steps id="0" last="${steps.length}">${stepsContent}</steps>`;
            }

            // Prepare work item fields
            const workItemFields: any = {
                "System.Title": title,
                "System.WorkItemType": "Test Case"
            };

            if (description) {
                workItemFields["System.Description"] = description;
            }

            if (stepsXml) {
                workItemFields["Microsoft.VSTS.TCM.Steps"] = stepsXml;
            }

            if (priority) {
                workItemFields["Microsoft.VSTS.Common.Priority"] = priority;
            }

            if (areaPath) {
                workItemFields["System.AreaPath"] = areaPath;
            }

            if (iterationPath) {
                workItemFields["System.IterationPath"] = iterationPath;
            }

            if (tags) {
                workItemFields["System.Tags"] = tags;
            }

            // Create patch document
            const patchDocument = Object.keys(workItemFields).map(key => ({
                op: "add",
                path: `/fields/${key}`,
                value: workItemFields[key]
            }));

            // Create the test case
            const createdWorkItem = await witApi.createWorkItem(
                undefined,
                patchDocument,
                projectName,
                "Test Case"
            );

            return {
                content: [{
                    type: "text" as const,
                    text: `**Test Case Created Successfully!**\n\n` +
                        `**ID**: ${createdWorkItem.id}\n` +
                        `**Title**: ${createdWorkItem.fields!["System.Title"]}\n` +
                        `**State**: ${createdWorkItem.fields!["System.State"]}\n` +
                        `**Priority**: ${createdWorkItem.fields!["Microsoft.VSTS.Common.Priority"] || "Not set"}\n` +
                        `**Area Path**: ${createdWorkItem.fields!["System.AreaPath"]}\n` +
                        `**Iteration Path**: ${createdWorkItem.fields!["System.IterationPath"]}\n` +
                        `**URL**: ${createdWorkItem._links?.html?.href || "Not available"}\n\n` +
                        `${steps && steps.length > 0 ? `Created with ${steps.length} test step(s).` : "Created without test steps."}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text" as const,
                    text: `Error creating test case: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }
};
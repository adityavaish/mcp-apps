import { z } from "zod";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { getGitApi } from "../utils/azure-devops-client";

// Tool to list pull requests
export const listPullRequestsTool = {
    name: "git-list-pull-requests",
    description: `
        Lists pull requests in an Azure DevOps repository with filtering options.
        
        This tool retrieves information about pull requests in the specified repository,
        including title, ID, status, creator, source branch, target branch, and URL.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the repository
          Example: "FabrikamFiber"
        - repositoryName: The exact name of the Git repository to list pull requests from
          Example: "FabrikamFiber-Web"
        - status: The status of pull requests to retrieve (default: "active")
          Valid values: 
            - "active": In progress pull requests
            - "abandoned": Discarded pull requests
            - "completed": Merged/completed pull requests
            - "all": All pull requests regardless of status
        - days: Optional number of days back to look for PRs (only applies to completed PRs)
          Example: 7 for last 7 days, 30 for last 30 days
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        status: z.enum(["active", "abandoned", "completed", "all"]).default("active").describe("Pull request status"),
        days: z.number().int().min(1).max(365).optional().describe("Number of days back to look for PRs (only applies to completed PRs)"),
    },
    handler: async ({ organizationUrl, project, repositoryName, status, days }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        status: "active" | "abandoned" | "completed" | "all";
        days?: number;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);
            // Get the repository ID
            const repositories = await gitApi.getRepositories(project);
            const repository = repositories.find((repo) =>
                repo.name && repo.name.toLowerCase() === repositoryName.toLowerCase()
            );

            if (!repository || !repository.id) {
                return {
                    content: [{ type: "text" as const, text: `Repository "${repositoryName}" not found in project "${project}".` }],
                };
            }

            // Map status string to GitInterfaces.PullRequestStatus
            let statusFilter: GitInterfaces.PullRequestStatus | undefined;
            if (status === "active") statusFilter = GitInterfaces.PullRequestStatus.Active;
            else if (status === "abandoned") statusFilter = GitInterfaces.PullRequestStatus.Abandoned;
            else if (status === "completed") statusFilter = GitInterfaces.PullRequestStatus.Completed;

            // Get pull requests
            const pullRequests = await gitApi.getPullRequests(
                repository.id,
                {
                    status: statusFilter,
                }
            );

            if (!pullRequests || pullRequests.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No ${status} pull requests found in repository "${repositoryName}".` }],
                };
            }

            // Filter by days if specified and status is completed
            let filteredPRs = pullRequests;
            if (days && (status === "completed" || status === "all")) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                
                filteredPRs = pullRequests.filter(pr => {
                    if (pr.closedDate) {
                        return new Date(pr.closedDate) >= cutoffDate;
                    }
                    return false;
                });
            }

            // Format the results
            const formattedText = filteredPRs.map((pr) => {
                const closedInfo = pr.closedDate ? `\nClosed: ${pr.closedDate}` : '';
                return `Title: ${pr.title}\nID: ${pr.pullRequestId}\nStatus: ${pr.status}\nCreated by: ${pr.createdBy?.displayName || "Unknown"}\nSource Branch: ${pr.sourceRefName}\nTarget Branch: ${pr.targetRefName}${closedInfo}\nURL: ${pr.url}\n-------------------------`;
            }).join("\n");

            const resultSummary = days && (status === "completed" || status === "all") 
                ? `Found ${filteredPRs.length} ${status} pull requests in the last ${days} days:`
                : `Found ${filteredPRs.length} ${status} pull requests:`;

            return {
                content: [{ type: "text" as const, text: `${resultSummary}\n\n${formattedText}` }],
            };
        } catch (error) {
            console.error("Error listing pull requests:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing pull requests: ${errorMessage}` }],
            };
        }
    }
};

import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";

// Tool to create a pull request
export const createPullRequestTool = {
    name: "git-create-pull-request",
    description: `
        Creates a new pull request in an Azure DevOps repository.
        
        This tool creates a new pull request between two branches in the specified repository,
        allowing you to initiate code reviews and merge processes.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the repository
          Example: "FabrikamFiber"
        - repositoryName: The exact name of the Git repository to create the pull request in
          Example: "FabrikamFiber-Web"
        - sourceBranch: The name of the branch containing the changes
          Example: "feature/new-feature" (do not include "refs/heads/")
        - targetBranch: The name of the branch to merge changes into (default: "main")
          Example: "main", "master", "develop" (do not include "refs/heads/")
        - title: The title of the pull request
          Example: "Add new login feature"
        - description: Optional description for the pull request
          Example: "This PR adds the new login UI and authentication logic"
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        sourceBranch: z.string().describe("Source branch name (without refs/heads/)"),
        targetBranch: z.string().default("main").describe("Target branch name (without refs/heads/)"),
        title: z.string().describe("Pull request title"),
        description: z.string().optional().describe("Pull request description"),
    },
    handler: async ({ organizationUrl, project, repositoryName, sourceBranch, targetBranch, title, description }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        sourceBranch: string;
        targetBranch: string;
        title: string;
        description?: string;
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

            // Format branch names with refs/heads/ prefix if not already present
            const sourceRefName = sourceBranch.startsWith("refs/") ? sourceBranch : `refs/heads/${sourceBranch}`;
            const targetRefName = targetBranch.startsWith("refs/") ? targetBranch : `refs/heads/${targetBranch}`;

            // Create pull request
            const pullRequestToCreate = {
                sourceRefName: sourceRefName,
                targetRefName: targetRefName,
                title: title,
                description: description,
                repositoryId: repository.id,
            };

            const createdPR = await gitApi.createPullRequest(pullRequestToCreate, repository.id);

            if (!createdPR || !createdPR.pullRequestId) {
                return {
                    content: [{ type: "text" as const, text: "Failed to create pull request. Please check your inputs and try again." }],
                };
            }

            // Construct the URL for the created PR
            const prUrl = `${organizationUrl}/${project}/_git/${repositoryName}/pullrequest/${createdPR.pullRequestId}`;

            return {
                content: [{ 
                    type: "text" as const, 
                    text: `
                    Pull Request created successfully!
                    
                    Title: ${createdPR.title}
                    ID: ${createdPR.pullRequestId}
                    Status: ${createdPR.status}
                    Source Branch: ${createdPR.sourceRefName}
                    Target Branch: ${createdPR.targetRefName}
                    Created By: ${createdPR.createdBy?.displayName || "Unknown"}
                    
                    View Pull Request: ${prUrl}
                    `
                }],
            };
        } catch (error) {
            console.error("Error creating pull request:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error creating pull request: ${errorMessage}` }],
            };
        }
    }
};

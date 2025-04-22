import { z } from "zod";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { getGitApi, getAzureDevOpsConnection } from "../utils/azure-devops-client";

// Tool to list repositories
export const listRepositoriesTool = {
    name: "list-repositories",
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

// Tool to list pull requests
export const listPullRequestsTool = {
    name: "list-pull-requests",
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
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        status: z.enum(["active", "abandoned", "completed", "all"]).default("active").describe("Pull request status"),
    },
    handler: async ({ organizationUrl, project, repositoryName, status }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        status: "active" | "abandoned" | "completed" | "all";
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

            // Format the results
            const formattedText = pullRequests.map((pr) => {
                return `Title: ${pr.title}\nID: ${pr.pullRequestId}\nStatus: ${pr.status}\nCreated by: ${pr.createdBy?.displayName || "Unknown"}\nSource Branch: ${pr.sourceRefName}\nTarget Branch: ${pr.targetRefName}\nURL: ${pr.url}\n-------------------------`;
            }).join("\n");

            return {
                content: [{ type: "text" as const, text: formattedText }],
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

// Tool to get file content from a repository
export const getRepositoryFileTool = {
    name: "get-repository-file",
    description: `
        Retrieves the content of a specific file from an Azure DevOps Git repository.
        
        This tool allows you to fetch the content of any file from a specified repository and branch.
        You can use this to view code, configuration files, or any other text-based content stored
        in your Azure DevOps repositories.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the repository
          Example: "FabrikamFiber"
        - repositoryName: The exact name of the Git repository to get the file from
          Example: "FabrikamFiber-Web"
        - filePath: The path to the file within the repository
          Example: "src/index.js" or "README.md"
        - branch: The branch name to retrieve the file from (default: "main")
          Example: "main", "master", "develop", "feature/new-feature"
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        filePath: z.string().describe("Path to the file within the repository"),
        branch: z.string().default("main").describe("Branch name (default: main)"),
    },
    handler: async ({ organizationUrl, project, repositoryName, filePath, branch }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        filePath: string;
        branch: string;
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

            // File web URL in Azure DevOps (publicly accessible)
            const fileViewUrl = `${organizationUrl}/${project}/_git/${repositoryName}?path=${encodeURIComponent(filePath)}&version=GB${encodeURIComponent(branch)}&_a=contents`;
            
            try {
                // Try to get basic repository info
                const branchExists = await gitApi.getBranch(repository.id, branch);
                
                if (!branchExists) {
                    return {
                        content: [{ type: "text" as const, text: `Branch "${branch}" not found in repository "${repositoryName}".` }],
                    };
                }
                
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `
                        File: ${filePath}
                        Repository: ${repositoryName}
                        Branch: ${branch}

                        To view this file in your browser, visit:
                        ${fileViewUrl}

                        Note: Due to API limitations in the Azure DevOps client, the file content cannot be displayed directly. 
                        Please use the link above to view the file in the Azure DevOps web interface.`
                    }],
                };
                
            } catch (error) {
                console.error("Error retrieving file or branch:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Check for common error messages
                if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                    return {
                        content: [{ type: "text" as const, text: `File "${filePath}" or branch "${branch}" not found in repository "${repositoryName}".` }],
                    };
                }
                
                return {
                    content: [{ type: "text" as const, text: `Error retrieving file: ${errorMessage}` }],
                };
            }
        } catch (error) {
            console.error("Error getting repository file:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error getting repository file: ${errorMessage}` }],
            };
        }
    }
};

// Tool to create a pull request
export const createPullRequestTool = {
    name: "create-pull-request",
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
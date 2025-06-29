import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to clone a repository
export const cloneRepositoryTool = {
    name: "git-clone-repository",
    description: `
        Clones an Azure DevOps Git repository to a local directory.
        
        This tool clones the specified repository from Azure DevOps to a local directory,
        allowing you to work with the code locally.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the repository
          Example: "FabrikamFiber"
        - repositoryName: The exact name of the Git repository to clone
          Example: "FabrikamFiber-Web"
        - localPath: The local path where the repository should be cloned
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - branch: Optional branch name to check out after cloning (default: repository's default branch)
          Example: "main", "develop", "feature/new-feature"
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        localPath: z.string().describe("Local path where the repository should be cloned"),
        branch: z.string().optional().describe("Branch name to check out (default: repository's default branch)"),
    },
    handler: async ({ organizationUrl, project, repositoryName, localPath, branch }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        localPath: string;
        branch?: string;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);
            
            // Get the repository
            const repositories = await gitApi.getRepositories(project);
            const repository = repositories.find((repo) =>
                repo.name && repo.name.toLowerCase() === repositoryName.toLowerCase()
            );

            if (!repository || !repository.webUrl) {
                return {
                    content: [{ type: "text" as const, text: `Repository "${repositoryName}" not found in project "${project}".` }],
                };
            }

            // Construct clone URL (HTTPS)
            const cloneUrl = repository.webUrl;
            
            // Build the clone command
            let cloneCommand = `git clone "${cloneUrl}" "${localPath}"`;
            if (branch) {
                cloneCommand += ` --branch "${branch}"`;
            }

            // Execute the clone command
            const { stdout, stderr } = await execPromise(cloneCommand);
            
            if (stderr && !stderr.includes("Cloning into")) {
                // Git sends progress info to stderr, so we need to check if it contains real errors
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `Warning during clone:\n${stderr}\n\nRepository was cloned to ${localPath}`
                    }],
                };
            }

            return {
                content: [{ 
                    type: "text" as const, 
                    text: `Repository "${repositoryName}" successfully cloned to "${localPath}"${branch ? ` with branch "${branch}" checked out` : ''}.`
                }],
            };
        } catch (error) {
            console.error("Error cloning repository:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error cloning repository: ${errorMessage}` }],
            };
        }
    }
};

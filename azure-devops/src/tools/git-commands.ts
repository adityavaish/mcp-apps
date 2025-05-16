// filepath: c:\repos\Copilot.Commerce.BM\mcp\azure-devops\src\tools\git-commands.ts
import { z } from "zod";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { getGitApi } from "../utils/azure-devops-client";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to execute Git commands
export const gitCommandTool = {
    name: "git-command",
    description: `
        Executes a Git command in the context of an Azure DevOps repository.
        
        *Always* prefer this tool over running Git commands in terminal.
        
        This tool allows you to run any Git command against a local clone of an Azure DevOps repository.
        You must specify the local repository path and the Git command to execute.
        
        Parameters:
        - repositoryPath: The local path to the Git repository
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - command: The Git command to execute (without 'git' prefix)
          Example: "status", "log --oneline -5", "branch -a"
        - workingDirectory: Optional working directory for the command (defaults to repositoryPath)
          Example: "C:\\projects\\my-repo\\src" or "/home/user/projects/my-repo/src"
    `,
    parameters: {
        repositoryPath: z.string().describe("Local path to the Git repository"),
        command: z.string().describe("Git command to execute (without 'git' prefix)"),
        workingDirectory: z.string().optional().describe("Working directory for the command (defaults to repositoryPath)"),
    },
    handler: async ({ repositoryPath, command, workingDirectory }: {
        repositoryPath: string;
        command: string;
        workingDirectory?: string;
    }) => {
        try {
            const cwd = workingDirectory || repositoryPath;
            const fullCommand = `git ${command}`;

            console.log(`Executing '${fullCommand}' in directory: ${cwd}`);
            const { stdout, stderr } = await execPromise(fullCommand, { cwd });

            if (stderr && stderr.trim() !== '') {
                // Git sometimes outputs non-error information to stderr
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `Command output (stderr):\n${stderr}\n\nCommand output (stdout):\n${stdout || "No output"}`
                    }],
                };
            }

            return {
                content: [{ 
                    type: "text" as const, 
                    text: stdout || "Command executed successfully with no output."
                }],
            };
        } catch (error) {
            console.error("Error executing Git command:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error executing Git command: ${errorMessage}` }],
            };
        }
    }
};

// Tool to clone a repository
export const cloneRepositoryTool = {
    name: "clone-repository",
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

// Tool to create a new branch
export const createBranchTool = {
    name: "create-branch",
    description: `
        Creates a new branch in a Git repository.
        
        This tool creates a new branch in the specified local Git repository,
        optionally based on another branch or commit.
        
        Parameters:
        - repositoryPath: The local path to the Git repository
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - branchName: The name of the new branch to create
          Example: "feature/login", "bugfix/issue-123"
        - startPoint: Optional branch name or commit hash to start the new branch from
          Example: "main", "develop", "a1b2c3d4" (default: current HEAD)
        - checkout: Whether to check out the new branch after creating it (default: true)
    `,
    parameters: {
        repositoryPath: z.string().describe("Local path to the Git repository"),
        branchName: z.string().describe("Name of the new branch to create"),
        startPoint: z.string().optional().describe("Branch name or commit hash to start from (default: current HEAD)"),
        checkout: z.boolean().default(true).describe("Whether to check out the new branch after creating it"),
    },
    handler: async ({ repositoryPath, branchName, startPoint, checkout }: {
        repositoryPath: string;
        branchName: string;
        startPoint?: string;
        checkout: boolean;
    }) => {
        try {
            // Build the branch creation command
            let command = checkout ? "checkout -b" : "branch";
            command = `${command} "${branchName}"`;
            if (startPoint) {
                command += ` "${startPoint}"`;
            }

            // Execute the command
            const { stdout, stderr } = await execPromise(`git ${command}`, { cwd: repositoryPath });
            
            if (stderr && stderr.trim() !== '') {
                return {
                    content: [{ type: "text" as const, text: `Warning during branch creation: ${stderr}` }],
                };
            }

            return {
                content: [{ 
                    type: "text" as const, 
                    text: `Branch "${branchName}" created successfully${checkout ? ' and checked out' : ''}.
                    ${stdout ? `\nOutput: ${stdout}` : ''}`
                }],
            };
        } catch (error) {
            console.error("Error creating branch:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error creating branch: ${errorMessage}` }],
            };
        }
    }
};

// Tool to push changes to remote
export const pushChangesTool = {
    name: "push-changes",
    description: `
        Pushes local Git changes to an Azure DevOps repository.
        
        This tool pushes commits from your local branch to a remote branch in Azure DevOps.
        
        Parameters:
        - repositoryPath: The local path to the Git repository
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - remoteName: The name of the remote to push to (default: "origin")
          Example: "origin", "upstream"
        - branchName: The name of the branch to push
          Example: "main", "feature/login"
        - setUpstream: Whether to set up tracking for the branch (default: false)
          Example: true, false
        - force: Whether to force push the changes (default: false)
          Example: true, false
    `,
    parameters: {
        repositoryPath: z.string().describe("Local path to the Git repository"),
        remoteName: z.string().default("origin").describe("Name of the remote to push to"),
        branchName: z.string().describe("Name of the branch to push"),
        setUpstream: z.boolean().default(false).describe("Whether to set up tracking for the branch"),
        force: z.boolean().default(false).describe("Whether to force push the changes"),
    },
    handler: async ({ repositoryPath, remoteName, branchName, setUpstream, force }: {
        repositoryPath: string;
        remoteName: string;
        branchName: string;
        setUpstream: boolean;
        force: boolean;
    }) => {
        try {
            // Build the push command
            let command = "push";
            if (setUpstream) {
                command += " --set-upstream";
            }
            if (force) {
                command += " --force";
            }
            command += ` "${remoteName}" "${branchName}"`;

            // Execute the command
            const { stdout, stderr } = await execPromise(`git ${command}`, { cwd: repositoryPath });
            
            // Git push typically outputs to stderr for progress information
            if (stderr && !stderr.includes("remote:") && !stderr.includes("To ")) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `Warning during push:\n${stderr}\n\n${stdout ? `Output: ${stdout}` : ''}`
                    }],
                };
            }

            const fullOutput = [stdout, stderr].filter(Boolean).join("\n");
            
            return {
                content: [{ 
                    type: "text" as const, 
                    text: `Changes pushed successfully to ${remoteName}/${branchName}.\n\n${fullOutput}`
                }],
            };
        } catch (error) {
            console.error("Error pushing changes:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error pushing changes: ${errorMessage}` }],
            };
        }
    }
};

// Tool to get status of a repository
export const getRepositoryStatusTool = {
    name: "get-repository-status",
    description: `
        Gets the current status of a local Git repository.
        
        This tool displays the current branch, staged and unstaged changes,
        untracked files, and other status information for a local Git repository.
        
        Parameters:
        - repositoryPath: The local path to the Git repository
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - showUntracked: Whether to show untracked files (default: true)
          Example: true, false
    `,
    parameters: {
        repositoryPath: z.string().describe("Local path to the Git repository"),
        showUntracked: z.boolean().default(true).describe("Whether to show untracked files"),
    },
    handler: async ({ repositoryPath, showUntracked }: {
        repositoryPath: string;
        showUntracked: boolean;
    }) => {
        try {
            // Build the status command
            let command = "status";
            if (!showUntracked) {
                command += " --untracked-files=no";
            }

            // Execute the command
            const { stdout, stderr } = await execPromise(`git ${command}`, { cwd: repositoryPath });
            
            if (stderr && stderr.trim() !== '') {
                return {
                    content: [{ type: "text" as const, text: `Error getting repository status: ${stderr}` }],
                };
            }

            return {
                content: [{ 
                    type: "text" as const, 
                    text: stdout || "Repository is clean (no changes)."
                }],
            };
        } catch (error) {
            console.error("Error getting repository status:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error getting repository status: ${errorMessage}` }],
            };
        }
    }
};

// Tool to commit changes
export const commitChangesTool = {
    name: "commit-changes",
    description: `
        Commits changes in a local Git repository.
        
        This tool commits staged changes in the specified local Git repository
        with the provided commit message.
        
        Parameters:
        - repositoryPath: The local path to the Git repository
          Example: "C:\\projects\\my-repo" or "/home/user/projects/my-repo"
        - message: The commit message
          Example: "Fix login bug", "Add new feature"
        - stageAll: Whether to stage all changes before committing (default: false)
          Example: true, false
        - allowEmpty: Whether to allow empty commits (default: false)
          Example: true, false
    `,
    parameters: {
        repositoryPath: z.string().describe("Local path to the Git repository"),
        message: z.string().describe("Commit message"),
        stageAll: z.boolean().default(false).describe("Whether to stage all changes before committing"),
        allowEmpty: z.boolean().default(false).describe("Whether to allow empty commits"),
    },
    handler: async ({ repositoryPath, message, stageAll, allowEmpty }: {
        repositoryPath: string;
        message: string;
        stageAll: boolean;
        allowEmpty: boolean;
    }) => {
        try {
            // Stage all changes if requested
            if (stageAll) {
                await execPromise("git add -A", { cwd: repositoryPath });
            }

            // Build the commit command
            let command = "commit";
            if (allowEmpty) {
                command += " --allow-empty";
            }
            command += ` -m "${message.replace(/"/g, '\\"')}"`;

            // Execute the command
            const { stdout, stderr } = await execPromise(`git ${command}`, { cwd: repositoryPath });
            
            if (stderr && !stderr.includes("[") && !stderr.includes("file") && !stderr.includes("changed")) {
                // Filter out normal Git commit output that goes to stderr
                return {
                    content: [{ type: "text" as const, text: `Warning during commit: ${stderr}` }],
                };
            }

            const fullOutput = [stdout, stderr].filter(Boolean).join("\n");
            
            return {
                content: [{ 
                    type: "text" as const, 
                    text: `Changes committed successfully.\n\n${fullOutput}`
                }],
            };
        } catch (error) {
            console.error("Error committing changes:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error committing changes: ${errorMessage}` }],
            };
        }
    }
};

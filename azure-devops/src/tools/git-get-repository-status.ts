import { z } from "zod";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to get status of a repository
export const getRepositoryStatusTool = {
    name: "git-get-repository-status",
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

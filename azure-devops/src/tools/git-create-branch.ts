import { z } from "zod";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to create a new branch
export const createBranchTool = {
    name: "git-create-branch",
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

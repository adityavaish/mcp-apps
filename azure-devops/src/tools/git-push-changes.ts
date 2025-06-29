import { z } from "zod";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to push changes to remote
export const pushChangesTool = {
    name: "git-push-changes",
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

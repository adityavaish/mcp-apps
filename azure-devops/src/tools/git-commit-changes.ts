import { z } from "zod";
import * as child_process from "child_process";
import * as util from "util";

const execPromise = util.promisify(child_process.exec);

// Tool to commit changes
export const commitChangesTool = {
    name: "git-commit-changes",
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

import { z } from "zod";
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

import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";

const STATUS_MAP: Record<string, GitInterfaces.CommentThreadStatus> = {
    active: GitInterfaces.CommentThreadStatus.Active,
    fixed: GitInterfaces.CommentThreadStatus.Fixed,
    "won't-fix": GitInterfaces.CommentThreadStatus.WontFix,
    closed: GitInterfaces.CommentThreadStatus.Closed,
    "by-design": GitInterfaces.CommentThreadStatus.ByDesign,
    pending: GitInterfaces.CommentThreadStatus.Pending,
};

export const addPullRequestCommentTool = {
    name: "git-add-pr-comment",
    description: `
        Adds a new comment thread to a pull request. The thread can be a general PR-level
        comment (omit filePath) or an inline review comment anchored to a file/line range
        in the new (right) version of the diff.

        IMPORTANT — filePath format:
        - Must be repo-root relative AND start with a leading '/'.
        - Correct:   "/src/app.ts"
        - Incorrect: "src/app.ts"  (Azure DevOps will reject or silently ignore the anchor)

        Thread status values (controls how the comment appears in the PR review UI):
        - "active":     Open / unresolved. Default for new feedback.
        - "pending":    Draft visible only to the author until published; rarely needed.
        - "fixed":      Resolved as fixed (typical "resolve" status after a code change).
        - "closed":     Discussion ended without explicit resolution.
        - "won't-fix":  Acknowledged but won't be addressed.
        - "by-design":  Behavior is intentional; not a bug.

        Parameters:
        - organizationUrl: Azure DevOps organization URL
        - project: Project name
        - repositoryName: Repository name
        - pullRequestId: Pull request ID
        - content: The comment text (Markdown supported)
        - status: Initial thread status (default "active")
        - filePath: Optional file path starting with '/' to anchor the comment
          (e.g. "/src/app.ts"). Required for inline comments.
        - rightStartLine / rightStartColumn / rightEndLine / rightEndColumn: Optional
          1-based line/column range in the right (new) version of the file. Provide at
          least rightStartLine to create an inline review comment.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        content: z.string().describe("Comment content (Markdown supported)"),
        status: z
            .enum(["active", "fixed", "won't-fix", "closed", "by-design", "pending"])
            .default("active")
            .describe("Initial thread status"),
        filePath: z.string().optional().describe("Optional file path (e.g. '/src/app.ts') to anchor the comment"),
        rightStartLine: z.number().int().optional().describe("1-based start line in the right (new) file version"),
        rightStartColumn: z.number().int().optional().describe("1-based start column in the right file version"),
        rightEndLine: z.number().int().optional().describe("1-based end line in the right file version"),
        rightEndColumn: z.number().int().optional().describe("1-based end column in the right file version"),
    },
    handler: async ({
        organizationUrl,
        project,
        repositoryName,
        pullRequestId,
        content,
        status,
        filePath,
        rightStartLine,
        rightStartColumn,
        rightEndLine,
        rightEndColumn,
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        content: string;
        status: keyof typeof STATUS_MAP;
        filePath?: string;
        rightStartLine?: number;
        rightStartColumn?: number;
        rightEndLine?: number;
        rightEndColumn?: number;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);

            const repositories = await gitApi.getRepositories(project);
            const repository = repositories.find(
                (r) => r.name && r.name.toLowerCase() === repositoryName.toLowerCase()
            );
            if (!repository?.id) {
                return {
                    content: [{
                        type: "text" as const,
                        text: `Repository "${repositoryName}" not found in project "${project}".`,
                    }],
                };
            }

            const thread: GitInterfaces.GitPullRequestCommentThread = {
                status: STATUS_MAP[status],
                comments: [
                    {
                        parentCommentId: 0,
                        content,
                        commentType: GitInterfaces.CommentType.Text,
                    },
                ],
            };

            if (filePath) {
                const startLine = rightStartLine ?? 1;
                const endLine = rightEndLine ?? startLine;
                const startCol = rightStartColumn ?? 1;
                const endCol = rightEndColumn ?? Math.max(startCol, 1);
                thread.threadContext = {
                    filePath,
                    rightFileStart: { line: startLine, offset: startCol },
                    rightFileEnd: { line: endLine, offset: endCol },
                };
            }

            const created = await gitApi.createThread(
                thread,
                repository.id,
                pullRequestId,
                project
            );

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(
                        {
                            pullRequestId,
                            threadId: created?.id,
                            commentId: created?.comments?.[0]?.id,
                            status: created?.status,
                            filePath: created?.threadContext?.filePath ?? null,
                            createdBy: created?.comments?.[0]?.author?.displayName,
                        },
                        null,
                        2
                    ),
                }],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text" as const,
                    text: `Error adding pull request comment: ${msg}`,
                }],
            };
        }
    },
};

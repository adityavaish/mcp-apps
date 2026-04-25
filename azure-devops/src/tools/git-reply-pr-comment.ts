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

export const replyPullRequestCommentTool = {
    name: "git-reply-pr-comment",
    description: `
        Replies to an existing comment thread on a pull request, optionally updating the
        thread's status (e.g. resolve to "fixed" or "closed").

        Always call "git-list-pr-threads" first to discover the threadId. Note that Azure
        DevOps renders thread comments as a flat list, so parentCommentId is largely
        cosmetic — leaving it at 0 (thread root) is correct in almost all cases.

        updateStatus values (use to resolve or change a thread's state in the same call):
        - "active":     Open / unresolved
        - "fixed":      Resolved as fixed (typical "resolve" after the author addressed feedback)
        - "closed":     Discussion ended without explicit resolution
        - "won't-fix":  Acknowledged but won't be addressed
        - "by-design":  Behavior is intentional
        - "pending":    Draft / not yet published

        Parameters:
        - organizationUrl: Azure DevOps organization URL
        - project: Project name
        - repositoryName: Repository name
        - pullRequestId: Pull request ID
        - threadId: ID of the existing comment thread to reply to (from git-list-pr-threads)
        - content: Reply text (Markdown supported)
        - parentCommentId: Optional parent commentId within the thread (default: 0 = thread root).
          Leave at 0 unless you have a specific reason; comments render flat regardless.
        - updateStatus: Optional new thread status to set after replying.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        threadId: z.number().int().describe("Existing thread ID"),
        content: z.string().describe("Reply content (Markdown supported)"),
        parentCommentId: z.number().int().default(0).describe("Parent comment id within the thread (0 = root)"),
        updateStatus: z
            .enum(["active", "fixed", "won't-fix", "closed", "by-design", "pending"])
            .optional()
            .describe("Optional new status for the thread after replying"),
    },
    handler: async ({
        organizationUrl,
        project,
        repositoryName,
        pullRequestId,
        threadId,
        content,
        parentCommentId,
        updateStatus,
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        threadId: number;
        content: string;
        parentCommentId: number;
        updateStatus?: keyof typeof STATUS_MAP;
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

            const createdComment = await gitApi.createComment(
                {
                    parentCommentId,
                    content,
                    commentType: GitInterfaces.CommentType.Text,
                },
                repository.id,
                pullRequestId,
                threadId,
                project
            );

            let updatedStatusValue: GitInterfaces.CommentThreadStatus | undefined;
            if (updateStatus) {
                const updated = await gitApi.updateThread(
                    { status: STATUS_MAP[updateStatus] },
                    repository.id,
                    pullRequestId,
                    threadId,
                    project
                );
                updatedStatusValue = updated?.status;
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(
                        {
                            pullRequestId,
                            threadId,
                            commentId: createdComment?.id,
                            parentCommentId: createdComment?.parentCommentId,
                            author: createdComment?.author?.displayName,
                            publishedDate: createdComment?.publishedDate,
                            updatedThreadStatus: updateStatus
                                ? { name: updateStatus, value: updatedStatusValue }
                                : null,
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
                    text: `Error replying to pull request comment: ${msg}`,
                }],
            };
        }
    },
};

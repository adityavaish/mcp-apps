import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";

export const listPullRequestThreadsTool = {
    name: "git-list-pr-threads",
    description: `
        Lists comment threads on a pull request, including each comment's id, author,
        content, status, and any file/line context. Use this to discover threadIds for
        replying with "git-reply-pr-comment".

        Parameters:
        - organizationUrl: Azure DevOps organization URL
        - project: Project name
        - repositoryName: Repository name
        - pullRequestId: Pull request ID
        - includeDeleted: Whether to include deleted threads/comments (default: false)
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        includeDeleted: z.boolean().default(false).describe("Include deleted threads/comments"),
    },
    handler: async ({
        organizationUrl,
        project,
        repositoryName,
        pullRequestId,
        includeDeleted,
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        includeDeleted: boolean;
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

            const threads = await gitApi.getThreads(repository.id, pullRequestId, project);

            const simplified = (threads ?? [])
                .filter((t) => includeDeleted || !t.isDeleted)
                .map((t) => ({
                    threadId: t.id,
                    status: t.status,
                    publishedDate: t.publishedDate,
                    lastUpdatedDate: t.lastUpdatedDate,
                    isDeleted: t.isDeleted,
                    threadContext: t.threadContext
                        ? {
                            filePath: t.threadContext.filePath,
                            rightFileStart: t.threadContext.rightFileStart,
                            rightFileEnd: t.threadContext.rightFileEnd,
                            leftFileStart: t.threadContext.leftFileStart,
                            leftFileEnd: t.threadContext.leftFileEnd,
                        }
                        : null,
                    comments: (t.comments ?? [])
                        .filter((c) => includeDeleted || !c.isDeleted)
                        .map((c) => ({
                            commentId: c.id,
                            parentCommentId: c.parentCommentId,
                            author: c.author?.displayName,
                            authorId: c.author?.id,
                            commentType: c.commentType,
                            publishedDate: c.publishedDate,
                            lastUpdatedDate: c.lastUpdatedDate,
                            isDeleted: c.isDeleted,
                            content: c.content,
                        })),
                }));

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(
                        { pullRequestId, threadCount: simplified.length, threads: simplified },
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
                    text: `Error listing pull request threads: ${msg}`,
                }],
            };
        }
    },
};

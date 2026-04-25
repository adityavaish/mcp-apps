import { z } from "zod";
import { getGitApi, getAuthenticatedUserId } from "../utils/azure-devops-client";

// Azure DevOps reviewer vote values
const VOTE_VALUES = {
    approve: 10,
    "approve-with-suggestions": 5,
    reset: 0,
    "wait-for-author": -5,
    reject: -10,
} as const;

type VoteName = keyof typeof VOTE_VALUES;

export const setPullRequestVoteTool = {
    name: "git-set-pr-vote",
    description: `
        Casts (or updates) the calling user's review vote on a pull request. This is the
        programmatic equivalent of the Approve / Reject buttons in the Azure DevOps web UI
        and is how an AI reviewer signs off on or declines a PR.

        Vote values:
        - "approve" (10): Sign off. Counts toward required-reviewer policies and can
          trigger auto-complete if all other branch policies are satisfied.
        - "approve-with-suggestions" (5): Approve, but flag non-blocking suggestions.
        - "reset" (0): Clear any previous vote (return to "no vote").
        - "wait-for-author" (-5): Soft block — author should address feedback. Does not
          decline the PR.
        - "reject" (-10): Decline the PR. Hard block; prevents completion until reset.

        Typical AI-reviewer workflow:
          1) get-pr-basic-info       — read metadata, existing reviewers, current votes
          2) get-pr-code-diffs       — inspect the actual changes
          3) git-add-pr-comment      — leave inline review feedback (optional)
          4) git-set-pr-vote         — cast approve / reject / wait-for-author

        Side effects: Voting notifies the PR's subscribers and is evaluated against branch
        policies immediately. An "approve" that satisfies the last required reviewer can
        auto-complete and merge the PR if auto-complete is enabled.

        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g. https://dev.azure.com/fabrikam)
        - project: Project name containing the repository
        - repositoryName: Name of the Git repository containing the pull request
        - pullRequestId: Numeric ID of the pull request to vote on
        - vote: One of "approve" | "approve-with-suggestions" | "reset" | "wait-for-author" | "reject"
        - reviewerId: Optional GUID of the reviewer to set the vote for. Defaults to the
          authenticated caller. Specify another identity only if you have permission to
          vote on their behalf (rare; typically used by service accounts).
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        pullRequestId: z.number().int().describe("Pull request ID"),
        vote: z
            .enum([
                "approve",
                "approve-with-suggestions",
                "reset",
                "wait-for-author",
                "reject",
            ])
            .describe("Vote to cast"),
        reviewerId: z
            .string()
            .optional()
            .describe("Optional reviewer identity GUID. Defaults to the authenticated user."),
    },
    handler: async ({
        organizationUrl,
        project,
        repositoryName,
        pullRequestId,
        vote,
        reviewerId,
    }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        pullRequestId: number;
        vote: VoteName;
        reviewerId?: string;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);

            // Resolve repository ID
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

            const resolvedReviewerId =
                reviewerId ?? (await getAuthenticatedUserId(organizationUrl));

            const voteValue = VOTE_VALUES[vote];

            const result = await gitApi.createPullRequestReviewer(
                { vote: voteValue, id: resolvedReviewerId },
                repository.id,
                pullRequestId,
                resolvedReviewerId,
                project
            );

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(
                        {
                            pullRequestId,
                            repository: repositoryName,
                            project,
                            reviewerId: resolvedReviewerId,
                            reviewerDisplayName: result?.displayName,
                            voteName: vote,
                            voteValue,
                            isRequired: result?.isRequired ?? false,
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
                    text: `Error setting pull request vote: ${msg}`,
                }],
            };
        }
    },
};

import { z } from "zod";
import { getAccessToken } from "../services/token-manager";

/**
 * Azure DevOps Search REST API base host.
 * https://learn.microsoft.com/rest/api/azure/devops/search
 */
const SEARCH_API_VERSION = "7.1";

function buildSearchHost(organizationUrl: string): string {
    // organizationUrl is typically https://dev.azure.com/{org}
    // Search API lives at https://almsearch.dev.azure.com/{org}
    const url = new URL(organizationUrl);
    const orgPath = url.pathname.replace(/^\/+|\/+$/g, "");
    return `https://almsearch.dev.azure.com/${orgPath}`;
}

async function postSearch<T = any>(
    organizationUrl: string,
    project: string | undefined,
    endpoint: string,
    body: unknown
): Promise<T> {
    const token = await getAccessToken();
    const host = buildSearchHost(organizationUrl);
    const projectSegment = project ? `/${encodeURIComponent(project)}` : "";
    const url = `${host}${projectSegment}/_apis/search/${endpoint}?api-version=${SEARCH_API_VERSION}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
            `Azure DevOps Search API request failed (${response.status} ${response.statusText}): ${text}`
        );
    }

    return (await response.json()) as T;
}

function asStringArray(value: string | string[] | undefined): string[] | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value.length ? value : undefined;
    const trimmed = value.trim();
    return trimmed ? [trimmed] : undefined;
}

// ---------------------------------------------------------------------------
// Code search
// ---------------------------------------------------------------------------
export const searchCodeTool = {
    name: "search-code",
    description: `
        Searches source code across repositories in an Azure DevOps project using the
        Azure DevOps Code Search REST API. Requires the "Code Search" extension to be
        installed on the organization (it is enabled by default for most orgs).

        Supports the same query syntax as the Azure DevOps web UI, including filters
        like ext:ts, file:*.cs, repo:MyRepo, path:src/, and boolean operators.

        Parameters:
        - organizationUrl: Azure DevOps organization URL (https://dev.azure.com/{org}).
        - project: Project name to scope the search to.
        - searchText: The query string (e.g., "TODO ext:ts", "class MyService").
        - top: Max results to return (1-1000, default 50).
        - skip: Number of results to skip for pagination (default 0).
        - repositories: Optional list of repository names to restrict results to.
        - paths: Optional list of path filters (e.g., "src/").
        - branches: Optional list of branch names to restrict results to.
        - includeSnippet: When true (default), includes matched code snippets/hits.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        searchText: z.string().describe("Code search query string"),
        top: z.number().int().min(1).max(1000).optional().describe("Max results (default 50)"),
        skip: z.number().int().min(0).optional().describe("Results to skip for paging"),
        repositories: z.array(z.string()).optional().describe("Restrict to these repos"),
        paths: z.array(z.string()).optional().describe("Restrict to these paths"),
        branches: z.array(z.string()).optional().describe("Restrict to these branches"),
        includeSnippet: z.boolean().optional().describe("Include matched snippets (default true)"),
    },
    handler: async ({
        organizationUrl,
        project,
        searchText,
        top,
        skip,
        repositories,
        paths,
        branches,
        includeSnippet,
    }: {
        organizationUrl: string;
        project: string;
        searchText: string;
        top?: number;
        skip?: number;
        repositories?: string[];
        paths?: string[];
        branches?: string[];
        includeSnippet?: boolean;
    }) => {
        try {
            const filters: Record<string, string[]> = {
                Project: [project],
            };
            if (repositories && repositories.length) filters.Repository = repositories;
            if (paths && paths.length) filters.Path = paths;
            if (branches && branches.length) filters.Branch = branches;

            const body = {
                searchText,
                $top: top ?? 50,
                $skip: skip ?? 0,
                filters,
                includeFacets: false,
                includeSnippet: includeSnippet ?? true,
            };

            const result = await postSearch<any>(
                organizationUrl,
                project,
                "codesearchresults",
                body
            );

            const results = (result?.results ?? []).map((r: any) => ({
                fileName: r.fileName,
                path: r.path,
                repository: r.repository?.name,
                project: r.project?.name,
                branch: r.versions?.[0]?.branchName,
                contentId: r.contentId,
                matches: includeSnippet === false ? undefined : r.matches,
            }));

            const summary = {
                count: result?.count ?? results.length,
                returned: results.length,
                results,
            };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error searching code: ${message}` }],
            };
        }
    },
};

// ---------------------------------------------------------------------------
// Work item search
// ---------------------------------------------------------------------------
export const searchWorkItemsTool = {
    name: "search-work-items",
    description: `
        Searches work items across an Azure DevOps project using the Work Item Search
        REST API. Returns matching work items with highlighted hits across fields
        (title, description, comments, etc.). Use this for full-text search; for
        structured queries by field, use list-work-items (WIQL).

        Parameters:
        - organizationUrl: Azure DevOps organization URL.
        - project: Project name to scope the search to.
        - searchText: Free-text query string (supports field qualifiers like
          "AssignedTo:John", "State:Active", "WorkItemType:Bug").
        - top: Max results (1-1000, default 50).
        - skip: Results to skip for paging (default 0).
        - workItemTypes: Optional list of work item types to filter on (e.g., ["Bug","Task"]).
        - states: Optional list of states (e.g., ["Active","New"]).
        - assignedTo: Optional list of assignee display names or unique names.
        - areaPaths: Optional list of area paths to filter on.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        searchText: z.string().describe("Work item search query string"),
        top: z.number().int().min(1).max(1000).optional(),
        skip: z.number().int().min(0).optional(),
        workItemTypes: z.array(z.string()).optional(),
        states: z.array(z.string()).optional(),
        assignedTo: z.array(z.string()).optional(),
        areaPaths: z.array(z.string()).optional(),
    },
    handler: async ({
        organizationUrl,
        project,
        searchText,
        top,
        skip,
        workItemTypes,
        states,
        assignedTo,
        areaPaths,
    }: {
        organizationUrl: string;
        project: string;
        searchText: string;
        top?: number;
        skip?: number;
        workItemTypes?: string[];
        states?: string[];
        assignedTo?: string[];
        areaPaths?: string[];
    }) => {
        try {
            const filters: Record<string, string[]> = {
                "System.TeamProject": [project],
            };
            if (workItemTypes?.length) filters["System.WorkItemType"] = workItemTypes;
            if (states?.length) filters["System.State"] = states;
            if (assignedTo?.length) filters["System.AssignedTo"] = assignedTo;
            if (areaPaths?.length) filters["System.AreaPath"] = areaPaths;

            const body = {
                searchText,
                $top: top ?? 50,
                $skip: skip ?? 0,
                filters,
                includeFacets: false,
            };

            const result = await postSearch<any>(
                organizationUrl,
                project,
                "workitemsearchresults",
                body
            );

            const results = (result?.results ?? []).map((r: any) => ({
                id: r.fields?.["system.id"],
                workItemType: r.fields?.["system.workitemtype"],
                title: r.fields?.["system.title"],
                state: r.fields?.["system.state"],
                assignedTo: r.fields?.["system.assignedto"],
                areaPath: r.fields?.["system.areapath"],
                project: r.project?.name,
                url: r.url,
                hits: r.hits,
            }));

            const summary = {
                count: result?.count ?? results.length,
                returned: results.length,
                results,
            };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error searching work items: ${message}` }],
            };
        }
    },
};

// ---------------------------------------------------------------------------
// Wiki search
// ---------------------------------------------------------------------------
export const searchWikiTool = {
    name: "search-wiki",
    description: `
        Searches wiki pages across an Azure DevOps project using the Wiki Search REST
        API. Returns matching wiki pages with highlighted text hits.

        Parameters:
        - organizationUrl: Azure DevOps organization URL.
        - project: Project name to scope the search to.
        - searchText: Free-text query string.
        - top: Max results (1-1000, default 50).
        - skip: Results to skip for paging (default 0).
        - wikis: Optional list of wiki names to restrict the search to.
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL"),
        project: z.string().describe("Project name"),
        searchText: z.string().describe("Wiki search query string"),
        top: z.number().int().min(1).max(1000).optional(),
        skip: z.number().int().min(0).optional(),
        wikis: z.array(z.string()).optional().describe("Restrict to these wikis"),
    },
    handler: async ({
        organizationUrl,
        project,
        searchText,
        top,
        skip,
        wikis,
    }: {
        organizationUrl: string;
        project: string;
        searchText: string;
        top?: number;
        skip?: number;
        wikis?: string[];
    }) => {
        try {
            const filters: Record<string, string[]> = {
                Project: [project],
            };
            if (wikis?.length) filters.Wiki = wikis;

            const body = {
                searchText,
                $top: top ?? 50,
                $skip: skip ?? 0,
                filters,
                includeFacets: false,
            };

            const result = await postSearch<any>(
                organizationUrl,
                project,
                "wikisearchresults",
                body
            );

            const results = (result?.results ?? []).map((r: any) => ({
                fileName: r.fileName,
                path: r.path,
                wiki: r.wiki?.name,
                project: r.project?.name,
                hits: r.hits,
                contentId: r.contentId,
            }));

            const summary = {
                count: result?.count ?? results.length,
                returned: results.length,
                results,
            };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error searching wiki: ${message}` }],
            };
        }
    },
};

// Suppress unused warning for the helper kept for future filter normalization.
void asStringArray;

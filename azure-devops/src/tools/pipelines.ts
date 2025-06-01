import { z } from "zod";
import * as BuildInterfaces from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as ReleaseInterfaces from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import * as PipelinesInterfaces from "azure-devops-node-api/interfaces/PipelinesInterfaces";
import { getBuildApi, getReleaseApi, getPipelinesApi } from "../utils/azure-devops-client";

// Tool to list build pipelines
export const listBuildPipelinesTool = {
    name: "list-build-pipelines",
    description: `
        Lists all build pipelines (build definitions) available in an Azure DevOps project.
        
        This tool retrieves information about all build pipelines within the specified project,
        including their names, IDs, and other metadata.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project to list build pipelines from
          Example: "FabrikamFiber"
    `,    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        maxResults: z.number().optional().default(1000).describe("Maximum number of pipelines to return (default: 1000)"),
    },    handler: async ({ organizationUrl, project, maxResults }: {
        organizationUrl: string;
        project: string;
        maxResults: number;
    }) => {
        try {
            const pipelinesApi = await getPipelinesApi(organizationUrl);
            const pipelines = await pipelinesApi.listPipelines(project, undefined, maxResults);

            if (!pipelines || pipelines.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No build pipelines found in project ${project}.` }],
                };
            }

            // Format the pipelines for easier reading
            const formattedPipelines = pipelines.map(pipeline => {
                const webUrl = pipeline.url || "No URL available";
                return {
                    id: pipeline.id,
                    name: pipeline.name,
                    folder: pipeline.folder,
                    revision: pipeline.revision,
                    webUrl: webUrl,
                };
            });

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedPipelines, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing build pipelines:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing build pipelines: ${errorMessage}` }],
            };
        }
    }
};

// Tool to get build pipeline details
export const getBuildPipelineDetailsTool = {
    name: "get-build-pipeline-details",
    description: `
        Gets detailed information about a specific build pipeline (build definition) in an Azure DevOps project.
        
        This tool retrieves comprehensive details about the specified build pipeline including
        its configuration, steps, variables, triggers, and related resources.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the build pipeline
          Example: "FabrikamFiber"
        - pipelineId: The ID of the build pipeline to retrieve details for
          Example: 12, 42, 7
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        pipelineId: z.number().describe("Build pipeline ID"),
    },    handler: async ({ organizationUrl, project, pipelineId }: {
        organizationUrl: string;
        project: string;
        pipelineId: number;
    }) => {
        try {
            const pipelinesApi = await getPipelinesApi(organizationUrl);
            const pipeline = await pipelinesApi.getPipeline(project, pipelineId, 100);

            if (!pipeline) {
                return {
                    content: [{ type: "text" as const, text: `Build pipeline with ID ${pipelineId} not found in project ${project}.` }],
                };
            }

            // Format the pipeline details with type safety in mind
            const formattedDefinition = {
                id: pipeline.id,
                name: pipeline.name,
                folder: pipeline.folder,
                url: pipeline.url || "No URL available",
                revision: pipeline.revision,
                configuration: {
                    type: pipeline.configuration?.type
                },
                _links: pipeline._links
            };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedDefinition, null, 2) }],
            };
        } catch (error) {
            console.error("Error getting build pipeline details:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error getting build pipeline details: ${errorMessage}` }],
            };
        }
    }
};

// Tool to list build runs
export const listBuildRunsTool = {
    name: "list-build-runs",
    description: `
        Lists recent build runs (executions) for a specified Azure DevOps project or pipeline.
        
        This tool retrieves information about recent build runs including status, result,
        and timestamps. You can filter by pipeline ID or get results for all pipelines.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project
          Example: "FabrikamFiber"
        - pipelineId: Optional ID of a specific build pipeline to list runs for
          Example: 12, 42, 7
        - maxResults: The maximum number of results to return (default: 10)
          Example: 5, 10, 25
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        pipelineId: z.number().optional().describe("Build pipeline ID (optional)"),        maxResults: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
    },
    handler: async ({ organizationUrl, project, pipelineId, maxResults }: {
        organizationUrl: string;
        project: string;
        pipelineId?: number;
        maxResults: number;
    }) => {
        try {
            const pipelinesApi = await getPipelinesApi(organizationUrl);
            
            let runs: PipelinesInterfaces.Run[] = [];
            
            // If pipelineId is provided, get runs for that specific pipeline
            // Otherwise, we need to list all pipelines first and then get runs for each
            if (pipelineId) {
                runs = await pipelinesApi.listRuns(project, pipelineId);
            } else {
                // Get all pipelines and then collect runs up to maxResults
                const pipelines = await pipelinesApi.listPipelines(project);
                
                // For each pipeline, get its runs and add to our collection
                // Note: This is not the most efficient way but PipelinesApi doesn't have a method
                // to get runs across all pipelines in a single call
                let remainingResults = maxResults;
                for (const pipeline of pipelines) {
                    if (remainingResults <= 0) break;
                    
                    if (pipeline.id) {
                        const pipelineRuns = await pipelinesApi.listRuns(project, pipeline.id);
                        // Take only what we need
                        const limitedRuns = pipelineRuns.slice(0, remainingResults);
                        runs = runs.concat(limitedRuns);
                        remainingResults -= limitedRuns.length;
                    }
                }
            }
            
            // Make sure we don't exceed maxResults
            runs = runs.slice(0, maxResults);

            if (!runs || runs.length === 0) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: pipelineId 
                            ? `No build runs found for pipeline ID ${pipelineId} in project ${project}.`
                            : `No build runs found in project ${project}.`
                    }],
                };
            }

            // Format the runs for easier reading
            const formattedRuns = runs.map(run => {
                return {
                    id: run.id,
                    name: run.name,
                    pipelineId: run.pipeline?.id,
                    pipelineName: run.pipeline?.name || "Unknown pipeline",
                    state: PipelinesInterfaces.RunState[run.state || 0],
                    result: PipelinesInterfaces.RunResult[run.result || 0],
                    createdDate: run.createdDate,
                    finishedDate: run.finishedDate,
                    url: run.url || "No URL available",
                };            });

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedRuns, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing build runs:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing build runs: ${errorMessage}` }],
            };
        }
    }
};

// Tool to list release pipelines
export const listReleasePipelinesTool = {
    name: "list-release-pipelines",
    description: `
        Lists all release pipelines (release definitions) available in an Azure DevOps project.
        
        This tool retrieves information about all release pipelines within the specified project,
        including their names, IDs, and other metadata.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project to list release pipelines from
          Example: "FabrikamFiber"
    `,    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        maxResults: z.number().optional().default(1000).describe("Maximum number of pipelines to return (default: 1000)"),
    },
    handler: async ({ organizationUrl, project, maxResults }: {
        organizationUrl: string;
        project: string;
        maxResults: number;
    }) => {
        try {
            const releaseApi = await getReleaseApi(organizationUrl);
            const releaseDefinitions = await releaseApi.getReleaseDefinitions(project, undefined, undefined, undefined, undefined, undefined, undefined, maxResults);

            if (!releaseDefinitions || releaseDefinitions.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No release pipelines found in project ${project}.` }],
                };
            }

            // Format the release pipelines for easier reading
            const formattedPipelines = releaseDefinitions.map(pipeline => {
                // Extract environment names in a type-safe way
                const environments = pipeline.environments 
                    ? pipeline.environments.map(env => ({
                        id: env.id,
                        name: env.name,
                        rank: env.rank
                      }))
                    : [];

                return {
                    id: pipeline.id,
                    name: pipeline.name,
                    path: pipeline.path,
                    releaseNameFormat: pipeline.releaseNameFormat,
                    environments: environments,
                    webUrl: pipeline._links?.web?.href || "No URL available",
                    createdOn: pipeline.createdOn,
                    createdBy: pipeline.createdBy?.displayName || "Unknown",
                };
            });

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedPipelines, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing release pipelines:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing release pipelines: ${errorMessage}` }],
            };
        }
    }
};

// Tool to get release pipeline details
export const getReleasePipelineDetailsTool = {
    name: "get-release-pipeline-details",
    description: `
        Gets detailed information about a specific release pipeline (release definition) in an Azure DevOps project.
        
        This tool retrieves comprehensive details about the specified release pipeline including
        its configuration, environments, artifacts, and variables.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the release pipeline
          Example: "FabrikamFiber"
        - pipelineId: The ID of the release pipeline to retrieve details for
          Example: 12, 42, 7
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        pipelineId: z.number().describe("Release pipeline ID"),
    },
    handler: async ({ organizationUrl, project, pipelineId }: {
        organizationUrl: string;
        project: string;
        pipelineId: number;
    }) => {
        try {
            const releaseApi = await getReleaseApi(organizationUrl);
            const releaseDefinition = await releaseApi.getReleaseDefinition(project, pipelineId);

            if (!releaseDefinition) {
                return {
                    content: [{ type: "text" as const, text: `Release pipeline with ID ${pipelineId} not found in project ${project}.` }],
                };
            }

            // Extract environments data safely
            const environments = releaseDefinition.environments 
                ? releaseDefinition.environments.map(env => ({
                    id: env.id,
                    name: env.name,
                    rank: env.rank,
                    owner: env.owner?.displayName || "Unknown"
                  }))
                : [];

            // Extract artifacts data safely
            const artifacts = releaseDefinition.artifacts 
                ? releaseDefinition.artifacts.map(artifact => ({
                    sourceId: artifact.sourceId,
                    type: artifact.type,
                    alias: artifact.alias
                  }))
                : [];

            // Format the release definition for easier reading
            const formattedDefinition = {
                id: releaseDefinition.id,
                name: releaseDefinition.name,
                path: releaseDefinition.path,
                releaseNameFormat: releaseDefinition.releaseNameFormat,
                environments: environments,
                artifacts: artifacts,
                webUrl: releaseDefinition._links?.web?.href || "No URL available",
                createdOn: releaseDefinition.createdOn,
                createdBy: releaseDefinition.createdBy?.displayName || "Unknown",
                modifiedOn: releaseDefinition.modifiedOn,
                modifiedBy: releaseDefinition.modifiedBy?.displayName || "Unknown",
            };

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedDefinition, null, 2) }],
            };
        } catch (error) {
            console.error("Error getting release pipeline details:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error getting release pipeline details: ${errorMessage}` }],
            };
        }
    }
};

// Tool to list release runs
export const listReleaseRunsTool = {
    name: "list-release-runs",
    description: `
        Lists recent release runs (deployments) for a specified Azure DevOps project or pipeline.
        
        This tool retrieves information about recent release runs including status, environments,
        related artifacts, and timestamps. You can filter by pipeline ID or get results for all pipelines.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project
          Example: "FabrikamFiber"
        - pipelineId: Optional ID of a specific release pipeline to list runs for
          Example: 12, 42, 7
        - maxResults: The maximum number of results to return (default: 10)
          Example: 5, 10, 25
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        pipelineId: z.number().optional().describe("Release pipeline ID (optional)"),        maxResults: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
    },
    handler: async ({ organizationUrl, project, pipelineId, maxResults }: {
        organizationUrl: string;
        project: string;
        pipelineId?: number;
        maxResults: number;
    }) => {
        try {
            const releaseApi = await getReleaseApi(organizationUrl);
            
            // Get releases with type-safe parameters
            const releases = await releaseApi.getReleases(
                project,
                pipelineId, // definitionId
                undefined, // definitionEnvironmentId
                undefined, // searchText
                undefined, // createdBy
                undefined, // statusFilter
                undefined, // environmentStatusFilter
                undefined, // minCreatedTime
                undefined, // maxCreatedTime
                undefined, // queryOrder
                maxResults  // top
            );

            if (!releases || releases.length === 0) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: pipelineId 
                            ? `No release runs found for pipeline ID ${pipelineId} in project ${project}.`
                            : `No release runs found in project ${project}.`
                    }],
                };
            }

            // Format the release runs for easier reading
            const formattedReleases = releases.map(release => {
                // Extract environment data safely
                const environments = release.environments 
                    ? release.environments.map(env => ({
                        id: env.id,
                        name: env.name,
                        status: env.status,
                        triggerReason: env.triggerReason,
                      }))
                    : [];

                return {
                    id: release.id,
                    name: release.name,
                    status: release.status,
                    createdOn: release.createdOn,
                    createdBy: release.createdBy?.displayName || "Unknown",
                    definitionName: release.releaseDefinition?.name || "Unknown pipeline",
                    definitionId: release.releaseDefinition?.id,
                    description: release.description,
                    reason: release.reason,
                    environments: environments,
                    webUrl: release._links?.web?.href || "No URL available",
                };
            });

            return {
                content: [{ type: "text" as const, text: JSON.stringify(formattedReleases, null, 2) }],
            };
        } catch (error) {
            console.error("Error listing release runs:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error listing release runs: ${errorMessage}` }],
            };
        }
    }
};

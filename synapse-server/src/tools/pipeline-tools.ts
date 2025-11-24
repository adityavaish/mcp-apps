import { z } from "zod";
import { SynapseService } from "../services/synapseService.js";

// Common connection parameters schema
const connectionParametersSchema = {
  workspaceUrl: z.string().optional().describe("Synapse workspace URL (defaults to SYNAPSE_WORKSPACE_URL env var)"),
  storageAccountName: z.string().optional().describe("Azure Storage account name (defaults to STORAGE_ACCOUNT_NAME env var)"),
  fileSystemName: z.string().optional().describe("File system/container name (defaults to FILE_SYSTEM_NAME env var)")
};

export const startPipelineTool = {
  name: "start_synapse_pipeline",
  description: "Starts a Synapse pipeline run. Triggers a pipeline execution in Azure Synapse Analytics. You can optionally provide parameters to pass to the pipeline.",
  parameters: {
    pipelineName: z.string().describe("The name of the Synapse pipeline to start"),
    parameters: z.record(z.any()).optional().describe("Optional parameters to pass to the pipeline"),
    ...connectionParametersSchema
  },
  handler: async ({ pipelineName, parameters, workspaceUrl, storageAccountName, fileSystemName }: { 
    pipelineName: string; 
    parameters?: Record<string, any>;
    workspaceUrl?: string;
    storageAccountName?: string;
    fileSystemName?: string;
  }) => {
    try {
      const synapseService = new SynapseService({
        synapseWorkspaceUrl: workspaceUrl,
        storageAccountName,
        fileSystemName
      });
      const runId = await synapseService.startPipeline(pipelineName, parameters);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully started pipeline ${pipelineName}`, pipelineName, runId, parameters: parameters || {} }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const getPipelineStatusTool = {
  name: "get_pipeline_status",
  description: "Gets the status of a Synapse pipeline run. Retrieves the current status and details of a pipeline run. Use this to monitor pipeline execution after starting it.",
  parameters: {
    runId: z.string().describe("The pipeline run ID to check status for"),
    ...connectionParametersSchema
  },
  handler: async ({ runId, workspaceUrl, storageAccountName, fileSystemName }: { 
    runId: string;
    workspaceUrl?: string;
    storageAccountName?: string;
    fileSystemName?: string;
  }) => {
    try {
      const synapseService = new SynapseService({
        synapseWorkspaceUrl: workspaceUrl,
        storageAccountName,
        fileSystemName
      });
      const status = await synapseService.getPipelineRunStatus(runId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, runId, status: status.status, pipelineName: status.pipelineName, runStart: status.runStart, runEnd: status.runEnd, durationInMs: status.durationInMs, message: status.message, parameters: status.parameters, fullDetails: status }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const cancelPipelineTool = {
  name: "cancel_synapse_pipeline",
  description: "Cancels a running Synapse pipeline. Stops a pipeline run that is currently in progress.",
  parameters: {
    runId: z.string().describe("The pipeline run ID to cancel"),
    ...connectionParametersSchema
  },
  handler: async ({ runId, workspaceUrl, storageAccountName, fileSystemName }: { 
    runId: string;
    workspaceUrl?: string;
    storageAccountName?: string;
    fileSystemName?: string;
  }) => {
    try {
      const synapseService = new SynapseService({
        synapseWorkspaceUrl: workspaceUrl,
        storageAccountName,
        fileSystemName
      });
      await synapseService.cancelPipelineRun(runId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: `Successfully cancelled pipeline run ${runId}`, runId }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};

export const listPipelinesTool = {
  name: "list_synapse_pipelines",
  description: "Lists all pipelines in the Synapse workspace. Retrieves the names of all available pipelines in the workspace.",
  parameters: {
    ...connectionParametersSchema
  },
  handler: async ({ workspaceUrl, storageAccountName, fileSystemName }: {
    workspaceUrl?: string;
    storageAccountName?: string;
    fileSystemName?: string;
  }) => {
    try {
      const synapseService = new SynapseService({
        synapseWorkspaceUrl: workspaceUrl,
        storageAccountName,
        fileSystemName
      });
      const pipelines = await synapseService.listPipelines();
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, count: pipelines.length, pipelines }, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message, details: error.stack }, null, 2) }], isError: true };
    }
  }
};
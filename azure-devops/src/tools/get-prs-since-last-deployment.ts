import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsService } from '../services/azure-devops-service.js';

export const GetPRsSinceLastDeploymentSchema = z.object({
  organizationUrl: z.string().describe('Azure DevOps organization URL (e.g., https://dev.azure.com/organization)'),
  project: z.string().describe('Project name'),
  repositoryName: z.string().describe('Repository name'),
  serviceGroupName: z.string().describe('EV2 service group name'),
  pipelineId: z.string().describe('ID of the build pipeline'),
  days: z.number().optional().default(7).describe('Number of days to look back for deployments')
});

type GetPRsSinceLastDeploymentRequest = z.infer<typeof GetPRsSinceLastDeploymentSchema>;

export const getPRsSinceLastDeploymentTool: Tool = {
  name: 'get-prs-since-last-deployment',
  description: `
        Retrieves pull requests merged to master since the last successful deployment to production.
        
        This tool:
        1. Gets rollouts from EV2 deployment API from the past week
        2. Finds the latest successful deployment and its artifact version
        3. Gets the corresponding build in Azure DevOps
        4. Determines the commit SHA of that build
        5. Finds the commit date to master branch
        6. Lists all PRs that were merged after that commit date
        
        Parameters:
        - organizationUrl: Azure DevOps organization URL (e.g., https://dev.azure.com/organization)
        - project: Project name containing the repository
        - repositoryName: Name of the repository
        - serviceGroupName: EV2 service group name (e.g., "Microsoft.CFS.MACC.PROD")
        - pipelineId: ID of the build pipeline (e.g., "135558")
        - days: Number of days to look back for deployments (default: 7)
    `,
  inputSchema: {
    type: 'object',
    properties: {
      organizationUrl: {
        type: 'string',
        description: 'Azure DevOps organization URL'
      },
      project: {
        type: 'string',
        description: 'Project name'
      },
      repositoryName: {
        type: 'string',
        description: 'Repository name'
      },
      serviceGroupName: {
        type: 'string',
        description: 'EV2 service group name'
      },
      pipelineId: {
        type: 'string',
        description: 'ID of the build pipeline'
      },
      days: {
        type: 'number',
        description: 'Number of days to look back for deployments',
        default: 7,
        minimum: 1,
        maximum: 365
      }
    },
    required: ['organizationUrl', 'project', 'repositoryName', 'serviceGroupName', 'pipelineId']
  }
};

export async function handleGetPRsSinceLastDeployment(request: GetPRsSinceLastDeploymentRequest) {
  try {
    const azureDevOpsService = new AzureDevOpsService();
    
    const result = await azureDevOpsService.getPRsSinceLastDeployment(
      request.organizationUrl,
      request.project,
      request.repositoryName,
      request.serviceGroupName,
      request.pipelineId,
      request.days
    );

    const content = [
      {
        type: 'text' as const,
        text: `# PRs Since Last Deployment

## Summary
- **Total PRs since last deployment**: ${result.summary.totalPRs}
- **Analysis date**: ${result.summary.analysisDate}
- **Lookback period**: ${result.summary.lookbackDays} days

## Last Deployment Information
${result.lastDeployment ? `
- **Artifacts version**: ${result.lastDeployment.artifactsVersion || 'Unknown'}
- **Commit SHA**: ${result.lastDeployment.commitSha || 'Unknown'}
- **Deployment date**: ${result.lastDeployment.deploymentDate || 'Unknown'}
` : 'No deployment information available'}

## Pull Requests (${result.prs.length})

${result.prs.length === 0 ? 'No pull requests found since the last deployment.' : ''}

${result.prs.map((pr, index) => `
### ${index + 1}. ${pr.title || 'Untitled PR'} (#${pr.pullRequestId})

- **Created by**: ${pr.createdBy?.displayName || 'Unknown'}
- **Completed date**: ${pr.closedDate ? new Date(pr.closedDate).toLocaleDateString() : 'Unknown'}
- **Source branch**: ${pr.sourceRefName?.replace('refs/heads/', '') || 'Unknown'}
- **Target branch**: ${pr.targetRefName?.replace('refs/heads/', '') || 'Unknown'}
- **Status**: ${pr.status === 3 ? 'Completed' : pr.status === 1 ? 'Active' : pr.status === 2 ? 'Abandoned' : 'Unknown'}
- **Merge status**: ${pr.mergeStatus === 3 ? 'Succeeded' : pr.mergeStatus === 2 ? 'Conflicts' : pr.mergeStatus === 1 ? 'Queued' : 'Unknown'}
- **URL**: ${request.organizationUrl}/${request.project}/_git/${request.repositoryName}/pullrequest/${pr.pullRequestId}

${pr.description ? `**Description**: ${pr.description.substring(0, 200)}${pr.description.length > 200 ? '...' : ''}` : ''}
`).join('\n')}
`
      }
    ];

    return { content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific error types
    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      return {
        content: [{
          type: 'text' as const,
          text: `Authentication failed. Please check your Azure DevOps credentials and permissions for organization: ${request.organizationUrl}`
        }]
      };
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
      return {
        content: [{
          type: 'text' as const,
          text: `Resource not found. Please verify the organization URL, project name, and repository name are correct.`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving PRs since last deployment: ${errorMessage}`
      }]
    };
  }
}

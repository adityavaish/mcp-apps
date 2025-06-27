import axios from 'axios';
import * as azdev from 'azure-devops-node-api';
import { IReleaseApi } from 'azure-devops-node-api/ReleaseApi';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import { IBuildApi } from 'azure-devops-node-api/BuildApi';
import { getPersonalAccessTokenHandler } from 'azure-devops-node-api/WebApi';
import { IRequestHandler } from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { BuildResult } from 'azure-devops-node-api/interfaces/BuildInterfaces';

interface GetUndeployedPRsRequest {
  organizationUrl: string;
  project: string;
  repositoryName: string;
  serviceGroupName: string;
  pipelineId: string;
  days?: number;
}

interface UndeployedPRsResponse {
  status: string;
  prsNotDeployed: GitPullRequest[];
  lastDeployment?: {
    artifactsVersion?: string;
    commitSha?: string;
    deploymentDate?: string;
  };
  error?: string;
  message?: string;
}

// EV2 API constants
const AZURE_SERVICE_DEPLOY_RESOURCE = "https://azureservicedeploy.msft.net";
const EV2_API_VERSION = "api-version=2016-07-01";

/**
 * Get PRs that have been merged to master but not yet deployed to production
 */
export async function getUndeployedPRs(request: GetUndeployedPRsRequest): Promise<UndeployedPRsResponse> {
  try {
    console.log('Starting getUndeployedPRs execution...');
    
    const { 
      organizationUrl, 
      project, 
      repositoryName, 
      serviceGroupName,
      pipelineId,
      days = 30  // Default to 30 days if not specified
    } = request;

    console.log(`Parameters: org=${organizationUrl}, project=${project}, repo=${repositoryName}, serviceGroup=${serviceGroupName}, pipelineId=${pipelineId}, days=${days}`);

    // Validate required parameters
    const missingParams = [];
    if (!organizationUrl) missingParams.push('organizationUrl');
    if (!project) missingParams.push('project');
    if (!repositoryName) missingParams.push('repositoryName');
    if (!serviceGroupName) missingParams.push('serviceGroupName');
    if (!pipelineId) missingParams.push('pipelineId');

    if (missingParams.length > 0) {
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'Missing required parameters',
        message: `Missing required parameter(s): ${missingParams.join(', ')}`
      };
    }

    // Parse organization from the URL
    const orgName = organizationUrl.split('/').pop() || '';
    
    console.log('Getting authentication handlers...');
    
    // Get authentication handlers
    const adoHandler = await getAzureDevOpsHandler();
    const ev2Handler = await getEV2Handler();
    
    if (!adoHandler || !ev2Handler) {
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'Authentication failed',
        message: 'Failed to authenticate with Azure DevOps or EV2 API'
      };
    }
    
    console.log('Authentication successful. Finding latest successful deployment...');
    
    // Step 1: Find the latest successful deployment in EV2
    const latestDeployment = await findLatestSuccessfulDeployment(
      serviceGroupName, 
      days,
      ev2Handler
    );
    
    if (!latestDeployment) {
      console.log('No successful deployments found in the specified timeframe');
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'No deployments found',
        message: 'No successful deployments found in the specified timeframe'
      };
    }
    
    console.log(`Found latest successful deployment: ${latestDeployment.RolloutId}`);
    
    // Step 2: Get the artifacts version from the deployment
    const artifactsVersion = latestDeployment.ArtifactsVersion || 
                             latestDeployment.RolloutDetails?.ArtifactsRegistrationInfo?.ArtifactsVersion;
    
    if (!artifactsVersion) {
      console.log('No artifacts version found in the deployment');
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'No artifacts version found',
        message: 'Could not determine the artifacts version of the latest deployment'
      };
    }
    
    console.log(`Found artifacts version: ${artifactsVersion}`);
    
    // Step 3: Get the pipeline run that corresponds to the artifacts version
    console.log('Connecting to Azure DevOps API...');
    const connection = new azdev.WebApi(organizationUrl, adoHandler);
    const buildApi = await connection.getBuildApi();
    const gitApi = await connection.getGitApi();
    
    console.log(`Searching for build with artifacts version: ${artifactsVersion}`);
    
    // Find the build with the matching name (artifacts version)
    // Convert pipelineId to number safely, ensuring it's properly handled as a string in the parameters
    const pipelineIdNum = parseInt(pipelineId);
    if (isNaN(pipelineIdNum)) {
      console.log(`Invalid pipeline ID: ${pipelineId}`);
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'Invalid pipeline ID',
        message: `The provided pipeline ID is not a valid number: ${pipelineId}`
      };
    }
    
    const builds = await buildApi.getBuilds(
      project,
      [pipelineIdNum],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      50  // Get the last 50 builds to search through
    );
    
    console.log(`Found ${builds.length} builds to search through`);
    
    const matchingBuild = builds.find(build => build.buildNumber === artifactsVersion);
    
    if (!matchingBuild) {
      console.log(`No matching build found for artifacts version: ${artifactsVersion}`);
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'No matching build found',
        message: `Could not find a build matching artifacts version: ${artifactsVersion}`
      };
    }
    
    console.log(`Found matching build: ${matchingBuild.id} (${matchingBuild.buildNumber})`);
    
    // Step 4: Get the commit SHA from the build
    const commitSha = matchingBuild.sourceVersion;
    
    if (!commitSha) {
      console.log('No commit SHA found in the build');
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'No commit SHA found',
        message: 'Could not determine the commit SHA of the latest deployment'
      };
    }
    
    console.log(`Found commit SHA: ${commitSha}`);
    
    // Step 5: Get the commit date
    console.log(`Getting commit details for SHA: ${commitSha}`);
    const commit = await gitApi.getCommit(commitSha, repositoryName, project);
    
    if (!commit || !commit.committer || !commit.committer.date) {
      console.log('No commit date found');
      return {
        status: 'error',
        prsNotDeployed: [],
        error: 'No commit date found',
        message: 'Could not determine the date of the last deployed commit'
      };
    }
    
    const commitDate = new Date(commit.committer.date);
    console.log(`Found commit date: ${commitDate.toISOString()}`);
    
    // Step 6: Get all PRs merged to the target branch (master) after the commit date
    console.log(`Getting PRs merged to master after ${commitDate.toISOString()}...`);
    const pullRequests = await gitApi.getPullRequests(
      repositoryName,
      {
        status: 3,  // Completed PRs
        targetRefName: 'refs/heads/master',
        minTime: commitDate
      },
      project
    );
    
    console.log(`Found ${pullRequests.length} PRs merged to master after the last deployment`);
    
    return {
      status: 'success',
      prsNotDeployed: pullRequests,
      lastDeployment: {
        artifactsVersion,
        commitSha,
        deploymentDate: commitDate.toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error in getUndeployedPRs:', error);
    return {
      status: 'error',
      prsNotDeployed: [],
      error: error instanceof Error ? error.message : String(error),
      message: 'An unexpected error occurred while retrieving undeployed PRs'
    };
  }
}

/**
 * Get authenticated handler for Azure DevOps API
 */
async function getAzureDevOpsHandler(): Promise<IRequestHandler | null> {
  try {
    // Try to get PAT from environment variable first
    const pat = process.env.SYSTEM_ACCESSTOKEN || process.env.AZURE_DEVOPS_PAT;
    
    if (pat) {
      return getPersonalAccessTokenHandler(pat);
    }
    
    // Fallback to DefaultAzureCredential for authentication
    // This requires the DefaultAzureCredential to be configured with appropriate permissions
    const { DefaultAzureCredential } = await import('@azure/identity');
    
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken('499b84ac-1321-427f-aa17-267ca6975798/.default');
    
    if (token) {
      return getPersonalAccessTokenHandler(token.token);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Azure DevOps authentication handler:', error);
    return null;
  }
}

/**
 * Get authenticated handler for EV2 API
 */
async function getEV2Handler(): Promise<any> {
  try {
    // Try to get EV2 token from environment variable first
    const ev2Token = process.env.EV2_TOKEN;
    
    if (ev2Token) {
      return {
        headers: {
          'Authorization': `Bearer ${ev2Token}`,
          'Content-Type': 'application/json'
        }
      };
    }
    
    // Fallback to DefaultAzureCredential for authentication
    const { DefaultAzureCredential } = await import('@azure/identity');
    
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken(`${AZURE_SERVICE_DEPLOY_RESOURCE}/.default`);
    
    if (token) {
      return {
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting EV2 authentication handler:', error);
    return null;
  }
}

/**
 * Find the latest successful deployment from EV2
 */
async function findLatestSuccessfulDeployment(
  serviceGroupName: string, 
  days: number,
  authHandler: any
): Promise<any> {
  try {
    // Calculate dates for the lookback period
    const now = new Date();
    const lookbackDate = new Date(now);
    lookbackDate.setDate(lookbackDate.getDate() - days);
    
    const startTime = lookbackDate.toISOString();
    const endTime = now.toISOString();
    
    console.log(`Looking for deployments from ${startTime} to ${endTime}`);
    
    // Construct URL for rollouts API
    const rolloutUrl = `${AZURE_SERVICE_DEPLOY_RESOURCE}/api/rollouts?servicegroupname=${serviceGroupName}&startTimeFrom=${startTime}&startTimeTo=${endTime}&${EV2_API_VERSION}`;
    
    console.log(`Fetching rollouts from: ${rolloutUrl}`);
    
    // Get rollouts
    const response = await axios.get(rolloutUrl, authHandler);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch rollouts: HTTP ${response.status}`);
    }
    
    const rolloutData = response.data;
    
    // Handle both possible response formats
    const rollouts = Array.isArray(rolloutData) ? rolloutData : rolloutData.value || [];
    
    console.log(`Found ${rollouts.length} rollouts in the specified timeframe`);
    
    if (rollouts.length === 0) {
      return null;
    }
    
    // Print out all rollouts for debugging
    for (const rollout of rollouts) {
      console.log(`Rollout ID: ${rollout.RolloutId}, Status: ${rollout.Status}, Time: ${rollout.RolloutOperationInfo?.StartTime}`);
    }
    
    // List of required steps that must have "Succeeded" status
    // Make this a more relaxed check - we'll consider a deployment successful if ANY of these steps exist and have succeeded
    // or if the overall rollout status is "Succeeded"
    const possibleRequiredSteps = [
      "RegisterPolicies-westus-1",
      "CertificateManagement-westus-1",
      "ResourceProviderRegistration-westus-1",
      "CMTLRunValidations-westus-1",
      "ARMDeploy-westus-1",
      "DNS.DNSZone-westus-1",
      "DNS.DNSZoneDelegation-westus-1",
      "Synapse.StopTriggers-westus-1",
      "Synapse.DeployArtifacts-westus-1",
      "Synapse.StartTriggers-westus-1",
      "MaccGenevaActions-westus-1",
      "MaccSynthetics-westus-1",
      "GenevaAccount-westus-1"
    ];
    
    // Find successful rollouts (newest first)
    const successfulRollouts = [];
    
    console.log('Checking each rollout for successful required steps:');
    
    for (const rollout of rollouts) {
      const rolloutId = rollout.RolloutId;
      if (!rolloutId) continue;
      
      console.log(`\nAnalyzing rollout ${rolloutId}...`);
      
      // Get detailed information for this rollout
      const detailUrl = `${AZURE_SERVICE_DEPLOY_RESOURCE}/api/rollouts/${rolloutId}?servicegroupname=${serviceGroupName}&${EV2_API_VERSION}&embed-detail=true`;
      const detailResponse = await axios.get(detailUrl, authHandler);
      
      if (detailResponse.status !== 200) {
        console.log(`Failed to get details for rollout ${rolloutId}: HTTP ${detailResponse.status}`);
        continue;
      }
      
      const rolloutDetails = detailResponse.data;
      
      // First check the overall rollout status
      const overallStatus = rolloutDetails.Status || rollout.Status;
      console.log(`Overall rollout status: ${overallStatus}`);
      
      if (overallStatus === "Succeeded") {
        console.log(`  Rollout ${rolloutId} has overall status of Succeeded, accepting it as successful`);
        
        // Get the start time from the rollout
        const startTime = rollout.RolloutOperationInfo?.StartTime;
        if (startTime) {
          successfulRollouts.push({
            rollout: rolloutDetails,
            startTime: new Date(startTime)
          });
          continue; // Move to the next rollout since we already know this one is successful
        }
      }
      
      // Extract steps from the nested structure
      const stepStatuses: Record<string, string> = {};
      
      // Try to extract from ResourceGroups
      const resourceGroups = rolloutDetails.ResourceGroups || [];
      for (const resourceGroup of resourceGroups) {
        const steps = resourceGroup.Steps || [];
        for (const step of steps) {
          if (step.Name && step.Status) {
            stepStatuses[step.Name] = step.Status;
          }
        }
      }
      
      // If no steps found in ResourceGroups, try the Steps field directly
      if (Object.keys(stepStatuses).length === 0) {
        const steps = rolloutDetails.Steps || [];
        for (const step of steps) {
          if (step.Name && step.Status) {
            stepStatuses[step.Name] = step.Status;
          }
        }
      }
      
      console.log(`Found ${Object.keys(stepStatuses).length} steps in rollout ${rolloutId}`);
      
      // Log all the steps found
      for (const [stepName, status] of Object.entries(stepStatuses)) {
        console.log(`  Step: ${stepName}, Status: ${status}`);
      }
      
      // Check if any of the possible required steps exist and have succeeded
      const successfulRequiredSteps = [];
      
      for (const possibleStep of possibleRequiredSteps) {
        if (possibleStep in stepStatuses && stepStatuses[possibleStep] === "Succeeded") {
          successfulRequiredSteps.push(possibleStep);
        }
      }
      
      // If we have at least one successful required step, or there are no steps but overall status is Succeeded
      if (successfulRequiredSteps.length > 0 || (Object.keys(stepStatuses).length === 0 && overallStatus === "Succeeded")) {
        console.log(`  Found ${successfulRequiredSteps.length} successful required steps for rollout ${rolloutId}`);
        console.log(`  Successful steps: ${successfulRequiredSteps.join(', ')}`);
        
        // Get the start time from the rollout
        const startTime = rollout.RolloutOperationInfo?.StartTime;
        if (startTime) {
          successfulRollouts.push({
            rollout: rolloutDetails,
            startTime: new Date(startTime)
          });
        }
      } else {
        console.log(`  No required steps succeeded for rollout ${rolloutId}`);
      }
    }
    
    console.log(`\nFound ${successfulRollouts.length} successful rollouts`);
    
    // Sort by start time (descending) and return the latest
    if (successfulRollouts.length > 0) {
      successfulRollouts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      const latest = successfulRollouts[0];
      console.log(`Latest successful rollout: ${latest.rollout.RolloutId} from ${latest.startTime}`);
      return latest.rollout;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding latest successful deployment:', error);
    return null;
  }
}

import * as azdev from "azure-devops-node-api";
import * as WorkItemTrackingApi from "azure-devops-node-api/WorkItemTrackingApi";
import * as GitApi from "azure-devops-node-api/GitApi";
import { CoreApi } from "azure-devops-node-api/CoreApi";
import { BuildApi } from "azure-devops-node-api/BuildApi";
import { ReleaseApi } from "azure-devops-node-api/ReleaseApi";
import { getAccessToken } from "../services/token-manager";
import { PipelinesApi } from "azure-devops-node-api/PipelinesApi";

let connection: azdev.WebApi | null = null;

export async function getAzureDevOpsConnection(organizationUrl: string): Promise<azdev.WebApi> {
    connection = null;

    try {
        const accessToken = await getAccessToken();
        const authHandler = azdev.getBearerHandler(accessToken);
        connection = new azdev.WebApi(organizationUrl, authHandler);

        return connection;
    } catch (error) {
        console.error("Error getting Azure DevOps connection:", error);
        throw error;
    }
}

export async function getWorkItemTrackingApi(organizationUrl: string): Promise<WorkItemTrackingApi.IWorkItemTrackingApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getWorkItemTrackingApi();
}

export async function getGitApi(organizationUrl: string): Promise<GitApi.IGitApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getGitApi();
}

export async function getCoreApi(organizationUrl: string): Promise<CoreApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getCoreApi();
}

export async function getBuildApi(organizationUrl: string): Promise<BuildApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getBuildApi();
}

export async function getReleaseApi(organizationUrl: string): Promise<ReleaseApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getReleaseApi();
}

/**
 * Returns the unique identifier (GUID) of the user the access token is issued to.
 * Useful when an Azure DevOps API call requires a reviewerId / identity reference
 * (for example, casting a vote on a pull request) and the caller wants to act as themselves.
 */
export async function getAuthenticatedUserId(organizationUrl: string): Promise<string> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    const connectionData = await connection.connect();
    const userId = connectionData?.authenticatedUser?.id;
    if (!userId) {
        throw new Error("Unable to determine authenticated user id from Azure DevOps connection.");
    }
    return userId;
}

export async function getPipelinesApi(organizationUrl: string): Promise<PipelinesApi> {
    const connection = await getAzureDevOpsConnection(organizationUrl);
    return await connection.getPipelinesApi();
}
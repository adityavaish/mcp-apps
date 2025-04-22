import * as azdev from "azure-devops-node-api";
import * as WorkItemTrackingApi from "azure-devops-node-api/WorkItemTrackingApi";
import * as GitApi from "azure-devops-node-api/GitApi";
import { CoreApi } from "azure-devops-node-api/CoreApi";
import { getAccessToken } from "./token-manager";

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

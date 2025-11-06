import { DefaultAzureCredential } from "@azure/identity";
import { DataLakeServiceClient } from "@azure/storage-file-datalake";

export interface SynapseServiceConfig {
  synapseWorkspaceUrl?: string;
  storageAccountName?: string;
  fileSystemName?: string;
}

export class SynapseService {
  private credential: DefaultAzureCredential;
  private synapseWorkspaceUrl: string;
  private storageAccountName: string;
  private fileSystemName: string;

  constructor(config?: SynapseServiceConfig) {
    this.credential = new DefaultAzureCredential();

    // Accept parameters from config or fall back to environment variables
    this.synapseWorkspaceUrl = config?.synapseWorkspaceUrl || process.env.SYNAPSE_WORKSPACE_URL || "";
    this.storageAccountName = config?.storageAccountName || process.env.STORAGE_ACCOUNT_NAME || "";
    this.fileSystemName = config?.fileSystemName || process.env.FILE_SYSTEM_NAME || "";

    if (!this.synapseWorkspaceUrl) throw new Error("synapseWorkspaceUrl is required (provide in config or SYNAPSE_WORKSPACE_URL environment variable)");
    if (!this.storageAccountName) throw new Error("storageAccountName is required (provide in config or STORAGE_ACCOUNT_NAME environment variable)");
    if (!this.fileSystemName) throw new Error("fileSystemName is required (provide in config or FILE_SYSTEM_NAME environment variable)");
  }

  getDataLakeServiceClient(): DataLakeServiceClient {
    return new DataLakeServiceClient(`https://${this.storageAccountName}.dfs.core.windows.net`, this.credential);
  }

  getFileSystemName(): string {
    return this.fileSystemName;
  }

  async uploadToADLS(filePath: string, data: string | Buffer): Promise<void> {
    const serviceClient = this.getDataLakeServiceClient();
    const fileSystemClient = serviceClient.getFileSystemClient(this.fileSystemName);
    const fileClient = fileSystemClient.getFileClient(filePath);
    await fileClient.create();
    await fileClient.append(data, 0, data.length);
    await fileClient.flush(data.length);
  }

  async appendToADLS(filePath: string, data: string | Buffer, position: number): Promise<void> {
    const serviceClient = this.getDataLakeServiceClient();
    const fileSystemClient = serviceClient.getFileSystemClient(this.fileSystemName);
    const fileClient = fileSystemClient.getFileClient(filePath);
    await fileClient.append(data, position, data.length);
    await fileClient.flush(position + data.length);
  }

  async createDirectory(directoryPath: string): Promise<void> {
    const serviceClient = this.getDataLakeServiceClient();
    const fileSystemClient = serviceClient.getFileSystemClient(this.fileSystemName);
    const directoryClient = fileSystemClient.getDirectoryClient(directoryPath);
    await directoryClient.create();
  }

  async listFiles(directoryPath: string = ""): Promise<string[]> {
    const serviceClient = this.getDataLakeServiceClient();
    const fileSystemClient = serviceClient.getFileSystemClient(this.fileSystemName);
    const files: string[] = [];
    for await (const item of fileSystemClient.listPaths({ path: directoryPath || undefined })) {
      if (!item.isDirectory && item.name) files.push(item.name);
    }
    return files;
  }

  private async getAccessToken(): Promise<string> {
    const tokenResponse = await this.credential.getToken("https://dev.azuresynapse.net/.default");
    return tokenResponse.token;
  }

  async startPipeline(pipelineName: string, parameters?: Record<string, any>): Promise<string> {
    const token = await this.getAccessToken();
    const url = `${this.synapseWorkspaceUrl}/pipelines/${pipelineName}/createRun?api-version=2020-12-01`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: parameters ? JSON.stringify(parameters) : undefined
    });
    if (!response.ok) throw new Error(`Failed to start pipeline: ${response.statusText}`);
    const result: any = await response.json();
    return result.runId;
  }

  async getPipelineRunStatus(runId: string): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.synapseWorkspaceUrl}/pipelineruns/${runId}?api-version=2020-12-01`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to get pipeline status: ${response.statusText}`);
    return await response.json();
  }

  async cancelPipelineRun(runId: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${this.synapseWorkspaceUrl}/pipelineruns/${runId}/cancel?api-version=2020-12-01`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to cancel pipeline: ${response.statusText}`);
  }

  async listPipelines(): Promise<string[]> {
    const token = await this.getAccessToken();
    const url = `${this.synapseWorkspaceUrl}/pipelines?api-version=2020-12-01`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to list pipelines: ${response.statusText}`);
    const result: any = await response.json();
    return result.value.map((p: any) => p.name);
  }
}
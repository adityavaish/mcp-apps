import { AzureCliCredential, ChainedTokenCredential, InteractiveBrowserCredential } from "@azure/identity";
import * as dotenv from "dotenv";

dotenv.config();

const azureDevOpsScopes = ["https://app.vssps.visualstudio.com/.default"];

const credential = new ChainedTokenCredential(
    new AzureCliCredential(),
    new InteractiveBrowserCredential({additionallyAllowedTenants: ["*"], loginStyle: "popup"})
);

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now) {
        return cachedToken;
    }

    try {
        const tokenResponse = await credential.getToken(
            azureDevOpsScopes.join(" "), {
            tenantId: process.env.TENANT_ID || "common",
        });

        if (!tokenResponse || !tokenResponse.token) {
            throw new Error("Failed to acquire Azure DevOps token");
        }

        // Store the token in cache
        cachedToken = tokenResponse.token;

        // Set expiration time (expiresOn is in seconds from epoch)
        const expirationTime = tokenResponse.expiresOnTimestamp;
        tokenExpiresAt = expirationTime - (5 * 60 * 1000); // Token lifetime minus 5 minute safety buffer

        return cachedToken;
    } catch (error) {
        console.error("Error acquiring token:", error);
        throw new Error("Failed to acquire Azure DevOps access token");
    }
}
import { ChainedTokenCredential, InteractiveBrowserCredential } from "@azure/identity";
import * as dotenv from "dotenv";

dotenv.config();

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(clientId: string, tenantId: string, scopes: string[] | undefined): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken;
  }

  try {
    const credential = new InteractiveBrowserCredential(
      {
        clientId: clientId,
        tenantId: tenantId || "common",
        loginStyle: "popup"
      }
    );

    const tokenResponse = await credential.getToken(scopes || [`${clientId}/.default`]);

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
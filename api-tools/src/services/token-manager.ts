import { ChainedTokenCredential, InteractiveBrowserCredential } from "@azure/identity";
import * as dotenv from "dotenv";

dotenv.config();

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

// Map to store tokens by clientId + tenantId combination
const tokenCache: Map<string, TokenCacheEntry> = new Map();

// Helper function to create a cache key
function createCacheKey(clientId: string, tenantId: string): string {
  return `${clientId}|${tenantId}`;
}

export async function getAccessToken(clientId: string | undefined, tenantId: string | undefined, scopes: string[] | undefined): Promise<string> {
  const now = Date.now();

  // Resolve clientId and tenantId, using environment variables as fallback
  const resolvedClientId = clientId || process.env.AZURE_CLIENT_ID || '';
  const resolvedTenantId = tenantId || process.env.AZURE_TENANT_ID || 'common';

  // Create cache key for this client+tenant combination
  const cacheKey = createCacheKey(resolvedClientId, resolvedTenantId);

  // Check if we have a valid cached token for this combination
  const cachedEntry = tokenCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.token;
  }

  try {
    const credential = new InteractiveBrowserCredential(
      {
        clientId: resolvedClientId,
        tenantId: resolvedTenantId,
        loginStyle: "popup"
      }
    );

    const tokenResponse = await credential.getToken([`${resolvedClientId}/.default`].concat(scopes ? scopes : []));

    if (!tokenResponse || !tokenResponse.token) {
      throw new Error("Failed to acquire Azure DevOps token");
    }

    // Set expiration time (expiresOn is in seconds from epoch)
    const expirationTime = tokenResponse.expiresOnTimestamp;
    const expiresAt = expirationTime - (5 * 60 * 1000); // Token lifetime minus 5 minute safety buffer

    // Store the token in cache using the client+tenant key
    tokenCache.set(cacheKey, {
      token: tokenResponse.token,
      expiresAt: expiresAt
    });

    return tokenResponse.token;
  } catch (error) {
    console.error("Error acquiring token:", error);
    throw new Error("Failed to acquire Azure DevOps access token");
  }
}
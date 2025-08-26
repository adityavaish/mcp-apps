import { PublicClientApplication, Configuration, InteractiveRequest } from "@azure/msal-node";
import { NativeBrokerPlugin } from "@azure/msal-node-extensions";
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

  if (!resolvedClientId) {
    throw new Error("Client ID is required. Provide it as a parameter or set AZURE_CLIENT_ID environment variable.");
  }

  // Create cache key for this client+tenant combination
  const cacheKey = createCacheKey(resolvedClientId, resolvedTenantId);

  // Check if we have a valid cached token for this combination
  const cachedEntry = tokenCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.token;
  }

  // Try with native broker first
  try {
    return await acquireTokenWithNativeBroker(resolvedClientId, resolvedTenantId, scopes, cacheKey);
  } catch (nativeBrokerError) {
    console.log("Native broker failed, falling back to standard flow:", nativeBrokerError);
    throw new Error(`Failed to acquire access token: ${nativeBrokerError instanceof Error ? nativeBrokerError.message : 'Unknown error'}`);
  }
}

async function acquireTokenWithNativeBroker(clientId: string, tenantId: string, scopes: string[] | undefined, cacheKey: string): Promise<string> {
  const msalConfig: Configuration = {
    auth: {
      clientId: clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`
    },
    broker: {
      nativeBrokerPlugin: new NativeBrokerPlugin()
    },
  };

  const pca = new PublicClientApplication(msalConfig);

  // Interactive acquisition with native broker
  const interactiveRequest: InteractiveRequest = {
    scopes: scopes || [`${clientId}/.default`],
    openBrowser: async (url: string): Promise<void> => {
      const { default: open } = await import('open');
      await open(url);
    },
  };

  const tokenResponse = await pca.acquireTokenInteractive(interactiveRequest);

  if (!tokenResponse || !tokenResponse.accessToken) {
    throw new Error("Failed to acquire token with native broker");
  }

  const expirationTime = tokenResponse.expiresOn?.getTime()!;
  const expiresAt = expirationTime - (5 * 60 * 1000);

  tokenCache.set(cacheKey, {
    token: tokenResponse.accessToken,
    expiresAt: expiresAt
  });

  return tokenResponse.accessToken;
}
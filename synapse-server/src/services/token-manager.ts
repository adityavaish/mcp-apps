import { InteractiveBrowserCredential, useIdentityPlugin } from "@azure/identity";
import { nativeBrokerPlugin } from "@azure/identity-broker";
import * as dotenv from "dotenv";

// Initialize the broker plugin for WAM support
useIdentityPlugin(nativeBrokerPlugin);

dotenv.config();

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
  authenticationPromise: Promise<string> | null;
}

// Map to store tokens by scopes combination
const tokenCache: Map<string, TokenCacheEntry> = new Map();

// Helper function to create a cache key
function createCacheKey(scopes: string[]): string {
  return scopes.sort().join(',');
}

export async function getAccessToken(
  _clientId: string | undefined, 
  tenantId: string | undefined, 
  scopes: string[], 
  _useBroker: boolean = true
): Promise<string> {
  const now = Date.now();

  // Create cache key for this scopes combination
  const cacheKey = createCacheKey(scopes);

  // Check if we have a valid cached token for this combination
  const cachedEntry = tokenCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.token;
  }

  // If authentication is already in progress for these scopes, wait for it
  if (cachedEntry?.authenticationPromise) {
    console.log("Authentication already in progress, waiting...");
    return cachedEntry.authenticationPromise;
  }

  // Start authentication and store the promise
  const authenticationPromise = (async () => {
    try {
      console.log("Using Windows broker authentication (WAM) for interactive login");
      const credentialOptions: any = {
        additionallyAllowedTenants: ["*"],
        loginStyle: "popup",
        brokerOptions: {
          enabled: true,
          parentWindowHandle: new Uint8Array(0), // Empty Uint8Array will use the active window
          useDefaultBrokerAccount: false,
          legacyEnableMsaPassthrough: true
        }
      };

      const credential = new InteractiveBrowserCredential(credentialOptions);
      const tokenResponse = await credential.getToken(scopes.join(" "), {
        tenantId: tenantId || process.env.AZURE_TENANT_ID || "common",
      });

      if (!tokenResponse || !tokenResponse.token) {
        throw new Error("Failed to acquire token");
      }

      // Set expiration time with 5 minute safety buffer
      const expirationTime = tokenResponse.expiresOnTimestamp;
      const expiresAt = expirationTime - (5 * 60 * 1000);

      // Store the token in cache using the scopes key
      tokenCache.set(cacheKey, {
        token: tokenResponse.token,
        expiresAt: expiresAt,
        authenticationPromise: null
      });

      return tokenResponse.token;
    } catch (error) {
      console.error("Error acquiring token:", error);

      // Clear the failed authentication from cache
      tokenCache.delete(cacheKey);

      throw new Error("Failed to acquire access token");
    }
  })();

  // Store the promise in cache
  tokenCache.set(cacheKey, {
    token: "",
    expiresAt: 0,
    authenticationPromise: authenticationPromise
  });

  return authenticationPromise;
}
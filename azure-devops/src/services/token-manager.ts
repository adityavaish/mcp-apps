import { InteractiveBrowserCredential, useIdentityPlugin } from "@azure/identity";
import { nativeBrokerPlugin } from "@azure/identity-broker";
import * as dotenv from "dotenv";

// Initialize the broker plugin for WAM support
useIdentityPlugin(nativeBrokerPlugin);

dotenv.config();

const azureDevOpsScopes = ["https://app.vssps.visualstudio.com/.default"];

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;
let authenticationPromise: Promise<string> | null = null;

export async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now) {
        return cachedToken;
    }

    // If authentication is already in progress, wait for it
    if (authenticationPromise) {
        console.log("Authentication already in progress, waiting...");
        return authenticationPromise;
    }

    // Start authentication and store the promise
    authenticationPromise = (async () => {
        try {
            console.log("Using Windows broker authentication (WAM) for Azure DevOps interactive login");
            const credentialOptions: any = {
                additionallyAllowedTenants: ["*"],
                loginStyle: "popup",
                brokerOptions: {
                    enabled: true,
                    parentWindowHandle: new Uint8Array(0), // Empty Uint8Array will use the active window
                    useDefaultBrokerAccount: false, // Try default account before falling back to interactive
                    legacyEnableMsaPassthrough: true // Set to true if MSA account passthrough is needed
                }
            };

            const credential = new InteractiveBrowserCredential(credentialOptions);

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
        } finally {
            // Clear the promise after completion (success or failure)
            authenticationPromise = null;
        }
    })();

    return authenticationPromise;
}
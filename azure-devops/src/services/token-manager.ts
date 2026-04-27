import {
    AzureCliCredential,
    AzureDeveloperCliCredential,
    ChainedTokenCredential,
    DeviceCodeCredential,
    InteractiveBrowserCredential,
    TokenCredential,
    VisualStudioCodeCredential,
    useIdentityPlugin,
} from "@azure/identity";
import * as dotenv from "dotenv";

dotenv.config();

const azureDevOpsScopes = ["https://app.vssps.visualstudio.com/.default"];
const tenantId = process.env.TENANT_ID || "common";

// MCP servers communicate over stdout (JSON-RPC). All diagnostics MUST go to
// stderr or they will corrupt the protocol stream.
const log = (...args: unknown[]) => console.error("[azure-devops-mcp]", ...args);

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;
let authenticationPromise: Promise<string> | null = null;
let credentialChain: TokenCredential | null = null;

// Lazily build a platform-aware credential chain:
//   1. AzureCliCredential          (`az login`)               - all platforms
//   2. AzureDeveloperCliCredential (`azd auth login`)         - all platforms
//   3. VisualStudioCodeCredential  (VS Code Azure sign-in)    - all platforms
//   4. InteractiveBrowserCredential + WAM broker              - Windows only
//   5. DeviceCodeCredential        (prints code to stderr)    - all platforms
function buildCredential(): TokenCredential {
    if (credentialChain) {
        return credentialChain;
    }

    const credentials: TokenCredential[] = [
        new AzureCliCredential({ tenantId, additionallyAllowedTenants: ["*"] }),
        new AzureDeveloperCliCredential({ tenantId, additionallyAllowedTenants: ["*"] }),
        new VisualStudioCodeCredential({ tenantId, additionallyAllowedTenants: ["*"] }),
    ];

    if (process.platform === "win32") {
        try {
            // Load the WAM broker only on Windows; the native binding does not
            // exist for macOS/Linux and requiring it there throws.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { nativeBrokerPlugin } = require("@azure/identity-broker");
            useIdentityPlugin(nativeBrokerPlugin);
            credentials.push(
                new InteractiveBrowserCredential({
                    additionallyAllowedTenants: ["*"],
                    tenantId,
                    brokerOptions: {
                        enabled: true,
                        parentWindowHandle: new Uint8Array(0),
                        useDefaultBrokerAccount: false,
                        legacyEnableMsaPassthrough: true,
                    },
                } as any),
            );
        } catch (err) {
            log("WAM broker unavailable, skipping:", (err as Error).message);
        }
    }

    // Last-resort interactive flow that works in any terminal.
    credentials.push(
        new DeviceCodeCredential({
            tenantId,
            additionallyAllowedTenants: ["*"],
            userPromptCallback: (info) => {
                log(`To sign in, open ${info.verificationUri} and enter code ${info.userCode}`);
            },
        }),
    );

    credentialChain = new ChainedTokenCredential(...credentials);
    return credentialChain;
}

export async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now) {
        return cachedToken;
    }

    if (authenticationPromise) {
        log("Authentication already in progress, waiting...");
        return authenticationPromise;
    }

    authenticationPromise = (async () => {
        try {
            const credential = buildCredential();
            const tokenResponse = await credential.getToken(azureDevOpsScopes.join(" "), {
                tenantId,
            });

            if (!tokenResponse || !tokenResponse.token) {
                throw new Error("Failed to acquire Azure DevOps token");
            }

            cachedToken = tokenResponse.token;
            tokenExpiresAt = tokenResponse.expiresOnTimestamp - 5 * 60 * 1000;
            return cachedToken;
        } catch (error) {
            log("Error acquiring token:", (error as Error).message ?? error);
            throw new Error(
                "Failed to acquire Azure DevOps access token. Try `az login` (recommended), `azd auth login`, or sign in to the Azure VS Code extension.",
            );
        } finally {
            authenticationPromise = null;
        }
    })();

    return authenticationPromise;
}
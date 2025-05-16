// API Service for handling authenticated API calls
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ClientSecretCredential, DefaultAzureCredential, TokenCredential } from '@azure/identity';
import { PublicClientApplication, Configuration, AuthenticationResult, ClientApplication } from '@azure/msal-node';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Interface for API request configuration
export interface ApiRequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
  authType: 'msal' | 'azure-identity' | 'none';
  authConfig?: {
    // For MSAL
    clientId?: string;
    authority?: string;
    tenantId?: string;
    scopes?: string[];
    // For Azure Identity
    clientSecret?: string;
    managedIdentityClientId?: string;
  };
  timeout?: number; // Request timeout in milliseconds
  retryCount?: number; // Number of retries for transient errors
}

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  details?: any;
  headers?: Record<string, string>;
}

export class ApiService {
  private static msalConfigs: Map<string, ClientApplication> = new Map();
  private static azureCredentials: Map<string, TokenCredential> = new Map();

  /**
   * Makes an authenticated API call using Azure Identity or MSAL
   * @param config API request configuration
   * @returns API response
   */
  static async callApi<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // Maximum number of retries for transient errors
    const maxRetries = config.retryCount || 3;
    let retryCount = 0;
    let lastError: any = null;

    // Retry logic for transient errors
    while (retryCount <= maxRetries) {
      try {
        // Build the full URL
        const url = this.buildUrl(config.endpoint, config.path, config.queryParams);
        
        // Prepare headers
        const headers: Record<string, string> = {
          ...config.headers || {},
        };

        // Add authentication if required
        if (config.authType !== 'none') {
          try {
            const authHeader = await this.getAuthorizationHeader(config);
            if (authHeader) {
              headers['Authorization'] = authHeader;
            } else {
              console.warn('Authentication was requested but no authorization header was returned');
            }
          } catch (authError: any) {
            console.error('Authentication error:', authError);
            return {
              success: false,
              status: 401,
              error: `Authentication error: ${authError.message || 'Unknown authentication error'}`,
              details: authError instanceof Error ? { stack: authError.stack } : undefined
            };
          }
        }

        // Prepare the request config
        const requestConfig: AxiosRequestConfig = {
          method: config.method,
          url,
          headers,
          data: config.body,
          // Add a timeout to prevent requests from hanging indefinitely
          timeout: config.timeout || 30000, // Default 30 seconds timeout
          validateStatus: (status) => true, // Handle all status codes in our code
        };

        // Make the API call
        const response = await axios(requestConfig);

        // Check if it's an error status code
        if (response.status >= 400) {
          return {
            success: false,
            status: response.status,
            error: `HTTP Error: ${response.status} ${response.statusText || ''}`,
            details: response.data,
            headers: response.headers as Record<string, string>,
          };
        }

        // Return successful response
        return {
          success: true,
          status: response.status,
          data: response.data as T,
          headers: response.headers as Record<string, string>,
        };
      } catch (error: unknown) {
        // Safe error handling with type narrowing
        lastError = error;
        
        // Log the error regardless of type
        console.error(`API call error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // Check if it's an Axios error
        const isAxiosError = axios.isAxiosError(error);
        const axiosError = error as AxiosError;
        
        // Only retry on network errors or timeouts
        const isTransientError = 
          (isAxiosError && !axiosError.response) || // Network error
          (isAxiosError && axiosError.code === 'ECONNABORTED') || // Timeout
          (isAxiosError && axiosError.response && 
           [502, 503, 504].includes(axiosError.response.status)); // Server error
        
        if (isTransientError && retryCount < maxRetries) {
          // Exponential backoff with jitter: wait longer between each retry
          const delay = Math.min(1000 * (2 ** retryCount) + Math.random() * 1000, 10000);
          console.log(`Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
        
        // Either not a transient error or reached max retries
        break;
      }
    }

    // Return error response after all retries failed
    const errorResponse: ApiResponse = {
      success: false,
      status: 500,
      error: 'Unknown error occurred',
    };
    
    // Safely extract error details if possible
    if (lastError) {
      if (axios.isAxiosError(lastError)) {
        const axiosError = lastError as AxiosError;
        errorResponse.status = axiosError.response?.status || 500;
        errorResponse.error = axiosError.message;
        errorResponse.details = axiosError.response?.data;
        errorResponse.headers = axiosError.response?.headers as Record<string, string>;
      } else if (lastError instanceof Error) {
        errorResponse.error = lastError.message;
        errorResponse.details = { stack: lastError.stack };
      } else {
        errorResponse.error = String(lastError);
      }
    }
    
    return errorResponse;
  }

  /**
   * Builds a complete URL from endpoint, path, and query parameters
   */
  private static buildUrl(endpoint: string, path?: string, queryParams?: Record<string, string>): string {
    // Remove trailing slashes from endpoint
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    // Ensure path starts with a forward slash if provided
    const formattedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    
    // Build query string from params if any
    let queryString = '';
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        params.append(key, value);
      }
      queryString = `?${params.toString()}`;
    }
    
    return `${baseUrl}${formattedPath}${queryString}`;
  }

  /**
   * Gets the authorization header value using the specified auth method
   */
  private static async getAuthorizationHeader(config: ApiRequestConfig): Promise<string | undefined> {
    try {
      if (config.authType === 'msal') {
        return await this.getMsalAuthHeader(config);
      } else if (config.authType === 'azure-identity') {
        return await this.getAzureIdentityAuthHeader(config);
      }
      return undefined;
    } catch (error) {
      console.error('Error getting auth header:', error);
      throw error;
    }
  }

  /**
   * Gets an auth token using MSAL
   */  private static async getMsalAuthHeader(config: ApiRequestConfig): Promise<string> {
    const { clientId, authority, scopes = [] } = config.authConfig || {};
    
    if (!clientId) {
      throw new Error('ClientId is required for MSAL authentication');
    }

    // Default authority if not provided
    const fullAuthority = authority || `https://login.microsoftonline.com/${config.authConfig?.tenantId || 'common'}`;
    
    // Create or reuse MSAL client
    const cacheKey = `${clientId}:${fullAuthority}`;
    let msalClient = this.msalConfigs.get(cacheKey);
    
    if (!msalClient) {
      const msalConfig: Configuration = {
        auth: {
          clientId,
          authority: fullAuthority,
        }
      };
      
      msalClient = new PublicClientApplication(msalConfig);
      this.msalConfigs.set(cacheKey, msalClient);
    }

    try {
      // Get token silently if possible
      const accounts = await (msalClient as PublicClientApplication).getTokenCache().getAllAccounts();
      
      let authResult: AuthenticationResult | null = null;
      
      if (accounts.length > 0) {
        const silentRequest = {
          account: accounts[0],
          scopes,
        };
        
        try {
          authResult = await (msalClient as PublicClientApplication).acquireTokenSilent(silentRequest);
        } catch (silentError) {
          console.warn('Silent token acquisition failed, falling back to device code flow', silentError);
          // Continue to device code flow
        }
      }
      
      if (!authResult) {
        // If silent acquisition fails or no accounts, we need to get a new token
        const deviceCodeRequest = {
          scopes,
          deviceCodeCallback: (response: any) => {
            // In a real implementation, you would provide this to the user
            console.log(response.message);
          }
        };
        
        const deviceCodeResult = await (msalClient as PublicClientApplication).acquireTokenByDeviceCode(deviceCodeRequest);
        if (!deviceCodeResult) {
          throw new Error('Failed to acquire token through device code flow');
        }
        authResult = deviceCodeResult;
      }
      
      if (!authResult || !authResult.accessToken) {
        throw new Error('Failed to acquire access token');
      }
      
      return `Bearer ${authResult.accessToken}`;
    } catch (error) {
      console.error('MSAL authentication error:', error);
      throw error;
    }
  }

  /**
   * Gets an auth token using Azure Identity
   */  private static async getAzureIdentityAuthHeader(config: ApiRequestConfig): Promise<string> {
    const { clientId, clientSecret, tenantId, scopes = [] } = config.authConfig || {};
    
    if (!scopes || scopes.length === 0) {
      throw new Error('Scopes are required for Azure Identity authentication');
    }

    let credential: TokenCredential;
    const cacheKey = `${clientId || 'default'}:${tenantId || 'default'}`;
    
    if (this.azureCredentials.has(cacheKey)) {
      credential = this.azureCredentials.get(cacheKey)!;
    } else {
      // Determine which credential to use
      if (clientId && clientSecret && tenantId) {
        try {
          // Use service principal authentication with client secret
          credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        } catch (error) {
          console.error('Error creating ClientSecretCredential:', error);
          throw new Error(`Failed to create ClientSecretCredential: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        try {
          // Use default Azure credential (supports various authentication methods)
          const options = config.authConfig?.managedIdentityClientId ? 
            { managedIdentityClientId: config.authConfig.managedIdentityClientId } : 
            undefined;
          credential = new DefaultAzureCredential(options);
        } catch (error) {
          console.error('Error creating DefaultAzureCredential:', error);
          throw new Error(`Failed to create DefaultAzureCredential: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      this.azureCredentials.set(cacheKey, credential);
    }

    try {
      // Get token for the first scope (typically the resource URL)
      const scope = Array.isArray(scopes) ? scopes[0] : scopes;
      const tokenResponse = await credential.getToken(scope);
      
      if (!tokenResponse || !tokenResponse.token) {
        throw new Error('No token returned from Azure Identity');
      }
      
      return `Bearer ${tokenResponse.token}`;
    } catch (error) {
      console.error('Error getting token from Azure Identity:', error);
      throw new Error(`Failed to acquire token from Azure Identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

import axios from 'axios';
import { getAccessToken } from './token-manager';

export interface ApiRequestConfig {
  endpoint: string;
  method: string;
  path?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
  authType?: 'bearer' | 'basic' | 'interactive' | 'none';
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    // For interactive auth
    clientId?: string;
    authority?: string;
    tenantId?: string;
    scopes?: string[] | undefined;
    redirectUri?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
  response?: any;
}

export class ApiService {
  static async callApi<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(config.endpoint, config.path, config.queryParams);

      const headers: Record<string, string> = {
        ...config.headers || {},
      };

      // Add authentication headers if specified
      if (config.authType === 'bearer' && config.authConfig?.token) {
        headers['Authorization'] = `Bearer ${config.authConfig.token}`;
      } else if (config.authType === 'basic' && config.authConfig?.username) {
        const username = config.authConfig.username;
        const password = config.authConfig.password || '';
        const base64Auth = Buffer.from(`${username}:${password}`).toString('base64');

        headers['Authorization'] = `Basic ${base64Auth}`;

      } else if (config.authType === 'interactive') {
        try {
          const token = await getAccessToken(config.authConfig?.clientId, config.authConfig?.tenantId, config.authConfig?.scopes);

          headers['Authorization'] = `Bearer ${token}`;

        } catch (authError: any) {
          console.error('Interactive authentication error:', authError);
          return {
            success: false,
            status: 401,
            error: `Authentication error: ${authError.message || 'Unknown authentication error'}`
          };
        }
      }

      const response = await axios({
        method: config.method,
        url,
        headers,
        data: config.body,
        // Ensure response type is set to handle both JSON and non-JSON responses
        responseType: 'json',
        // Don't automatically transform non-JSON responses to prevent parsing errors
        transformResponse: [(data) => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              // If we can't parse as JSON, return the raw data
              console.warn(`Response from ${url} is not valid JSON`);
              return data;
            }
          }
          return data;
        }]
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      // Log useful debugging information      console.error('Error making API call:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response status:', error.response.status);

        // Only log response data if it's not huge
        if (typeof error.response.data === 'string' && error.response.data.length < 1000) {
          console.error('Response data:', error.response.data);
        } else if (typeof error.response.data === 'object') {
          console.error('Response data:', JSON.stringify(error.response.data).substring(0, 1000) + '...');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Request was made but no response was received');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }

      return {
        success: false,
        status: error.response?.status || 500,
        error: error.response?.data?.detail || error.message || 'Unknown error occurred',
        response: error.response, // Include the full response for debugging
      };
    }
  }

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
}
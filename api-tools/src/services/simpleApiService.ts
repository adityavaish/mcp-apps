import axios from 'axios';

export interface ApiRequestConfig {
  endpoint: string;
  method: string;
  path?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
  authType?: 'bearer' | 'basic' | 'none';
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
}

export class ApiService {
  static async callApi<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      // Build the full URL
      const url = this.buildUrl(config.endpoint, config.path, config.queryParams);
      
      // Prepare headers
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
      }

      // Make the request
      const response = await axios({
        method: config.method,
        url,
        headers,
        data: config.body
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      console.error('Error making API call:', error);
      return {
        success: false,
        status: error.response?.status || 500,
        error: error.message || 'Unknown error occurred',
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

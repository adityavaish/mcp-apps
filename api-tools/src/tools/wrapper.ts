// Update the tool handler typings using a wrapper function
import { apiCallTool as originalApiCallTool, getApiOperationsTool as originalGetApiOperationsTool } from "./api-call";

// Type definitions to match the McpServer expected format
interface ToolResponse {
  content: {
    type: "text";
    text: string;
  }[];
  isError?: boolean;
}

// Create a type-safe wrapper for handlers
function wrapHandler(handler: Function) {
  return async (args: Record<string, any>, extra: any): Promise<ToolResponse> => {
    const result = await handler(args, extra);
    return result;
  };
}

// Export the tools with wrapped handlers
export const apiCallTool = {
  ...originalApiCallTool,
  handler: wrapHandler(originalApiCallTool.handler)
};

export const getApiOperationsTool = {
  ...originalGetApiOperationsTool,
  handler: wrapHandler(originalGetApiOperationsTool.handler)
};

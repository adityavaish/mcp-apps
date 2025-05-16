import { z } from "zod";
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { ApiService } from '../services/apiService';

// Tool to make API calls with authentication
export const apiCallTool = {
  name: "call_api",
  description: `This tool makes authenticated API calls to a specified endpoint.
  It supports various authentication methods including Azure Identity and MSAL.
  
  Inputs:
  - endpoint: The base URL of the API endpoint to call
  - method: The HTTP method to use (GET, POST, PUT, PATCH, DELETE)
  - path: Optional path to append to the endpoint URL
  - queryParams: Optional query parameters to include in the request
  - headers: Optional headers to include in the request
  - body: Optional body data to include in the request
  - authType: Authentication method to use (msal, azure-identity, none)
  - authConfig: Configuration for the authentication method
  
  Example authConfig for MSAL:
  {
    "clientId": "your-client-id",
    "tenantId": "your-tenant-id",
    "scopes": ["https://graph.microsoft.com/.default"]
  }
  
  Example authConfig for Azure Identity:
  {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tenantId": "your-tenant-id",
    "scopes": ["https://management.azure.com/.default"]
  }
  
  The tool returns the API response including status code, headers, and data.`,
  parameters: {
    endpoint: z.string().describe("The base URL of the API endpoint to call"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("The HTTP method to use"),
    path: z.string().optional().describe("Optional path to append to the endpoint URL"),
    queryParams: z.record(z.string()).optional().describe("Optional query parameters to include"),
    headers: z.record(z.string()).optional().describe("Optional headers to include"),
    body: z.any().optional().describe("Optional body data to include"),
    authType: z.enum(["msal", "azure-identity", "none"]).default("none").describe("Authentication method to use"),
    authConfig: z.object({
      clientId: z.string().optional().describe("The client ID for authentication"),
      authority: z.string().optional().describe("The authority URL for MSAL authentication"),
      tenantId: z.string().optional().describe("The tenant ID for Azure authentication"),
      scopes: z.array(z.string()).optional().describe("The scopes required for API access"),
      clientSecret: z.string().optional().describe("The client secret for authentication"),
      managedIdentityClientId: z.string().optional().describe("The managed identity client ID to use")
    }).optional().describe("Configuration for the authentication method")
  },  handler: async (params: any) => {
    try {
      // Make the API call using our service
      const response = await ApiService.callApi({
        endpoint: params.endpoint,
        method: params.method,
        path: params.path,
        queryParams: params.queryParams,
        headers: params.headers,
        body: params.body,
        authType: params.authType,
        authConfig: params.authConfig
      });
      
      // Format response to match MCP format
      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error making API call:', error);
      return {
        content: [{
          type: "text",
          text: `Error making API call: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};

// Tool to explore OpenAPI specifications
export const getApiOperationsTool = {
  name: "get_api_operations",
  description: `This tool retrieves information about available operations from an OpenAPI specification.
  It can fetch the specification from a URL or use a provided specification object.
  
  Inputs:
  - specUrl: URL to the OpenAPI specification document
  - specContent: The OpenAPI specification content as an object (alternative to specUrl)
  - operationId: Optional specific operation ID to retrieve
  
  The tool returns a list of API operations including paths, methods, parameters, and other metadata.`,
  parameters: {
    specUrl: z.string().optional().describe("URL to the OpenAPI specification document"),
    specContent: z.any().optional().describe("The OpenAPI specification content as an object"),
    operationId: z.string().optional().describe("Optional specific operation ID to retrieve")
  },
  handler: async (params: any) => {
    try {
      // Ensure at least one of specUrl or specContent is provided
      if (!params.specUrl && !params.specContent) {
        throw new Error('Either specUrl or specContent must be provided');
      }
      
      // Fetch the OpenAPI spec if a URL is provided
      let specData;
      if (params.specUrl) {
        const response = await ApiService.callApi({
          endpoint: params.specUrl,
          method: 'GET',
          authType: 'none'
        });
        
        if (!response.success) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.error}`);
        }
        
        specData = response.data;
      } else if (params.specContent) {
        specData = params.specContent;
      }
      
      // Process the OpenAPI spec to extract operations
      const operations = extractOperationsFromSpec(specData, params.operationId);
        return {
        content: [{
          type: "text",
          text: JSON.stringify({ operations }, null, 2)
        } as const]
      };
    } catch (error: any) {
      console.error('Error processing API operations:', error);
      return {
        content: [{
          type: "text",
          text: `Error processing API operations: ${error.message || 'Unknown error'}`
        } as const],
        isError: true
      };
    }
  }
};

// Helper function to extract operations from an OpenAPI spec
function extractOperationsFromSpec(spec: any, operationId?: string) {
  const operations: any[] = [];
  
  // Process each path and method in the OpenAPI spec
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (method === 'parameters') continue; // Skip path-level parameters
        
        const op = operation as any;
        
        // Skip if looking for a specific operationId and this doesn't match
        if (operationId && op.operationId !== operationId) {
          continue;
        }
        
        operations.push({
          path,
          method: method.toUpperCase(),
          operationId: op.operationId,
          summary: op.summary,
          description: op.description,
          parameters: op.parameters,
          requestBody: op.requestBody,
          responses: op.responses,
          security: op.security
        });
        
        // If we found the specific operationId, no need to continue
        if (operationId && op.operationId === operationId) {
          break;
        }
      }
    }
  }
  
  return operations;
}

// Tool to fill PDF forms
export const fillPdfFormTool = {
  name: "fill_pdf_form",
  description: `This tool fills form fields in a PDF document.
  It can set text values for form fields, check/uncheck checkboxes, and select radio buttons.
  
  Inputs:
  - inputFilePath: Path to the input PDF file or file:// URL
  - outputFilePath: Path where the filled PDF will be saved
  - formFields: Object containing field names as keys and field values as values
  
  Example formFields:
  {
    "name": "John Doe",
    "email": "john@example.com",
    "agreeToTerms": true,
    "selectedOption": "Option B"
  }
  
  The tool returns information about which fields were successfully filled
  and any fields that could not be found or filled.
  
  Note: This tool only works with PDF forms that have defined form fields.
  For creating or modifying PDF content, use other PDF editing tools.`,
  parameters: {
    inputFilePath: z.string().describe("The path to the input PDF form file or file:// URL"),
    outputFilePath: z.string().describe("The path where the filled PDF form will be saved"),
    formFields: z.record(z.union([z.string(), z.boolean(), z.number()])).describe("Object containing field names and values to fill in the form")
  },
  handler: async ({ inputFilePath, outputFilePath, formFields }: {
    inputFilePath: string;
    outputFilePath: string;
    formFields: Record<string, string | boolean | number>;
  }) => {
    try {
      // Normalize file paths
      let inputPath = inputFilePath;
      if (inputPath.startsWith('file://')) {
        inputPath = inputPath.substring(8); // Remove 'file://' prefix
      }

      // Load the PDF document
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Get form fields in the document
      const form = pdfDoc.getForm();
      const existingFields = form.getFields();
      const existingFieldNames = existingFields.map(field => field.getName());

      // Track results
      const results = {
        success: [] as string[],
        notFound: [] as string[],
        error: [] as { field: string, error: string }[]
      };

      // Fill each field
      for (const [fieldName, fieldValue] of Object.entries(formFields)) {
        try {
          if (!existingFieldNames.includes(fieldName)) {
            results.notFound.push(fieldName);
            continue;
          }

          const field = form.getField(fieldName);

          if (field.constructor.name === 'PDFTextField') {
            // Text field
            const textField = form.getTextField(fieldName);
            textField.setText(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFCheckBox') {
            // Checkbox
            const checkBox = form.getCheckBox(fieldName);
            if (fieldValue === true) {
              checkBox.check();
            } else {
              checkBox.uncheck();
            }
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFRadioGroup') {
            // Radio button
            const radioGroup = form.getRadioGroup(fieldName);
            radioGroup.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFDropdown') {
            // Dropdown
            const dropdown = form.getDropdown(fieldName);
            dropdown.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFOptionList') {
            // Option list
            const optionList = form.getOptionList(fieldName);
            optionList.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else {
            results.error.push({
              field: fieldName,
              error: `Unsupported field type: ${field.constructor.name}`
            });
          }
        } catch (fieldError) {
          const errorMessage = fieldError instanceof Error ? fieldError.message : String(fieldError);
          results.error.push({ field: fieldName, error: errorMessage });
        }
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputFilePath, filledPdfBytes);      return {
        content: [{
          type: "text",
          text: `PDF form filled successfully and saved to: ${outputFilePath}
          
Fields filled: ${results.success.length}
Fields not found: ${results.notFound.length}
Fields with errors: ${results.error.length}

Details:
${JSON.stringify(results, null, 2)}`
        } as const]
      };
    } catch (error) {
      console.error("Error filling PDF form:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [{
          type: "text",
          text: `Error filling PDF form: ${errorMessage}`
        } as const],
        isError: true
      };
    }
  }
};

// Tool to get PDF form elements
export const getPdfFormElementsTool = {
  name: "get_pdf_form_elements",
  description: `This tool analyzes a PDF document and returns information about its form fields.
  It can identify text fields, checkboxes, radio buttons, dropdowns, and option lists.
  
  Inputs:
  - filePath: Path to the PDF file or file:// URL
  
  The tool returns details about each form field, including its name, type, and properties.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF form file or file:// URL"),
  },
  handler: async ({ filePath }: { filePath: string }) => {
    try {
      // Normalize file path
      let inputPath = filePath;
      if (inputPath.startsWith('file://')) {
        inputPath = inputPath.substring(8); // Remove 'file://' prefix
      }

      // Check if file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`PDF file not found: ${inputPath}`);
      }

      // Load the PDF document
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Get form fields
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      // Analyze each field
      const formElements = fields.map(field => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        let properties: any = { name: fieldName, type: fieldType.replace('PDF', '') };

        // Extract type-specific properties
        if (fieldType === 'PDFTextField') {
          const textField = form.getTextField(fieldName);
          const maxLength = textField.getMaxLength();
          properties = {
            ...properties,
            value: textField.getText(),
            maxLength: maxLength !== undefined && maxLength > 0 ? maxLength : undefined
          };
        }
        else if (fieldType === 'PDFCheckBox') {
          const checkBox = form.getCheckBox(fieldName);
          properties = {
            ...properties,
            isChecked: checkBox.isChecked()
          };
        }
        else if (fieldType === 'PDFRadioGroup') {
          const radioGroup = form.getRadioGroup(fieldName);
          properties = {
            ...properties,
            value: radioGroup.getSelected(),
            options: radioGroup.getOptions()
          };
        }
        else if (fieldType === 'PDFDropdown') {
          const dropdown = form.getDropdown(fieldName);
          properties = {
            ...properties,
            value: dropdown.getSelected(),
            options: dropdown.getOptions()
          };
        }
        else if (fieldType === 'PDFOptionList') {
          const optionList = form.getOptionList(fieldName);
          properties = {
            ...properties,
            selected: optionList.getSelected(),
            options: optionList.getOptions()
          };
        }

        return properties;
      });      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            fieldCount: formElements.length,
            fields: formElements
          }, null, 2)
        } as const]
      };
    } catch (error) {
      console.error("Error analyzing PDF form:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{
          type: "text",
          text: `Error analyzing PDF form: ${errorMessage}`
        } as const],
        isError: true
      };
    }
  }
};

// Create explicit exports for all tools
module.exports = {
  apiCallTool,
  getApiOperationsTool,
  fillPdfFormTool,
  getPdfFormElementsTool
};
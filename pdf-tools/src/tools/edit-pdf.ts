import { z } from "zod";
import * as fs from 'fs';
import { PDFService } from "../services/pdfService";

// Tool to edit PDF documents
export const editPDFTool = {
  name: "edit_pdf",
  description: `This tool edits a PDF document using pdf-lib.
  It can add text, add/remove pages, rotate pages, merge documents, and split documents.
  Inputs: sourceFilePath, outputFilePath, operation, and operation-specific parameters.
  Note: For extracting content, use the corresponding extraction tools.
  Note: For analyzing documents, use the 'analyze_document' tool.`,
  parameters: {
    sourceFilePath: z.string().describe("The path to the source PDF file"),
    outputFilePath: z.string().describe("The path where the edited PDF should be saved"),
    operation: z.enum([
      "addText", 
      "addPage", 
      "removePage", 
      "rotatePage", 
      "mergeDocuments", 
      "splitDocument"
    ]).describe("The editing operation to perform"),
    params: z.object({}).passthrough().describe("Operation-specific parameters")
  },
  handler: async ({ sourceFilePath, outputFilePath, operation, params }: {
    sourceFilePath: string;
    outputFilePath: string;
    operation: "addText" | "addPage" | "removePage" | "rotatePage" | "mergeDocuments" | "splitDocument";
    params: any;
  }) => {
    try {
      // Check if source file exists
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source PDF file not found: ${sourceFilePath}`);
      }
      
      // Validate parameters based on operation
      switch (operation) {
        case 'addText':
          if (!params.text || params.pageNumber === undefined || params.x === undefined || params.y === undefined) {
            throw new Error("For 'addText' operation, 'text', 'pageNumber', 'x', and 'y' parameters are required");
          }
          break;
          
        case 'addPage':
          // All parameters are optional for addPage
          break;
          
        case 'removePage':
          if (!params.pageIndices || !Array.isArray(params.pageIndices) || params.pageIndices.length === 0) {
            throw new Error("For 'removePage' operation, 'pageIndices' parameter is required and must be a non-empty array");
          }
          break;
          
        case 'rotatePage':
          if (!params.pageIndices || !Array.isArray(params.pageIndices) || params.pageIndices.length === 0 || 
              ![90, 180, 270].includes(params.rotation)) {
            throw new Error("For 'rotatePage' operation, 'pageIndices' must be a non-empty array and 'rotation' must be 90, 180, or 270");
          }
          break;
          
        case 'mergeDocuments':
          if (!params.filePaths || !Array.isArray(params.filePaths) || params.filePaths.length === 0) {
            throw new Error("For 'mergeDocuments' operation, 'filePaths' parameter is required and must be a non-empty array");
          }
          break;
          
        case 'splitDocument':
          if (!params.pageIndices || !Array.isArray(params.pageIndices) || params.pageIndices.length === 0 ||
              !params.outputFilePath) {
            throw new Error("For 'splitDocument' operation, 'pageIndices' must be a non-empty array and 'outputFilePath' is required");
          }
          break;
      }
      
      // Use the PDFService to edit the document
      const result = await PDFService.editPDF(sourceFilePath, outputFilePath, {
        operation,
        params
      });
      
      if (result.success) {
        return {
          content: [{ 
            type: "text" as const, 
            text: `PDF edited successfully: ${result.message}` 
          }]
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error editing PDF:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Error editing PDF: ${errorMessage}` 
        }]
      };
    }
  }
};

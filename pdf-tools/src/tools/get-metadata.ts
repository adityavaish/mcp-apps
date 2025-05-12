import { z } from "zod";
import * as fs from 'fs';
import { PDFService } from "../services/pdfService";

// Tool to get metadata from PDF documents
export const getMetadataTool = {
  name: "get_metadata",
  description: `This tool retrieves metadata from a PDF document.
  The result is a JSON object containing the document metadata.
  Inputs: filePath.
  Note: For extracting text content, use the 'extract_text' tool.
  Note: For extracting tables, use the 'extract_tables' tool.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF file")
  },
  handler: async ({ filePath }: {
    filePath: string;
  }) => {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }
      
      // Use the PDFService to get metadata
      const metadata = await PDFService.getMetadata(filePath);
      
      return {
        content: [{
          type: "text" as const, 
          text: `Document Metadata: ${JSON.stringify(metadata, null, 2)}` 
        }]
      };
    } catch (error) {
      console.error("Error getting metadata:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Error getting metadata: ${errorMessage}` 
        }]
      };
    }
  }
};

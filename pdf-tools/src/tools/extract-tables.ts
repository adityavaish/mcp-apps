import { z } from "zod";
import * as fs from 'fs';
import { PDFService } from "../services/pdfService";

// Tool to extract tables from PDF documents
export const extractTablesTool = {
  name: "extract_tables",
  description: `This tool extracts tables from a PDF document.
  The result is a JSON object containing the extracted tables.
  Inputs: filePath, pageNumbers (optional, extracts all pages by default).
  Note: For extracting text content, use the 'extract_text' tool.
  Note: For getting document metadata, use the 'get_metadata' tool.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF file"),
    pageNumbers: z.array(z.number().int().min(1)).optional().describe("Specific page numbers to extract tables from (1-based indexing)")
  },
  handler: async ({ filePath, pageNumbers }: {
    filePath: string;
    pageNumbers?: number[];
  }) => {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }
      
      // Extract tables using PDFService
      const extractedTables = await PDFService.extractTables(filePath, pageNumbers);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Extracted Tables: ${JSON.stringify(extractedTables, null, 2)}` 
        }]
      };
    } catch (error) {
      console.error("Error extracting tables:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Error extracting tables: ${errorMessage}` 
        }]
      };
    }
  }
};

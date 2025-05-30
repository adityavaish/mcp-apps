import { z } from "zod";
import { loadPdfWithPdfjs, extractTextFromPages } from "../services/pdfService";

// Tool to extract text from PDF documents
export const extractTextTool = {
  name: "extract_text",
  description: `This tool extracts text content from a PDF document.
  The result is a JSON array containing the extracted text from each page, with page numbers.
  Each page's text is represented as a separate object with 'page' number and 'text' content.
  
  Inputs: 
  - filePath: Path to the PDF file or file:// URL
  - pageNumbers (optional): Array of specific page numbers to extract text from (1-based indexing)
  
  If pageNumbers is not provided, the tool extracts text from all pages in the document.
  
  Note: For extracting tables, use the 'extract_tables' tool.
  Note: For getting document metadata, use the 'get_metadata' tool.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF file or file:// URL"),
    pageNumbers: z.array(z.number().int().min(1)).optional().describe("Specific page numbers to extract text from (1-based indexing)")
  },
  handler: async ({ filePath, pageNumbers }: {
    filePath: string;
    pageNumbers?: number[];
  }) => {
    try {
      // Load PDF document using the common service function
      const pdfDocument = await loadPdfWithPdfjs(filePath);

      // Extract text from specified pages using the common service function
      const result = await extractTextFromPages(pdfDocument, pageNumbers);

      return {
        content: [{
          type: "text" as const,
          text: `Extracted Text: ${JSON.stringify(result, null, 2)}`
        }]
      };
    } catch (error) {
      console.error("Error extracting text:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [{
          type: "text" as const,
          text: `Error extracting text: ${errorMessage}`
        }]
      };
    }
  }
};
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source path
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.js');

// Tool to extract text from PDF documents
export const extractTextTool = {
  name: "extract_text",
  description: `This tool extracts text content from a PDF document.
  The result is a JSON object containing the extracted text.
  Inputs: filePath, pageNumbers (optional, extracts all pages by default).
  Note: For extracting tables, use the 'extract_tables' tool.
  Note: For getting document metadata, use the 'get_metadata' tool.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF file"),
    pageNumbers: z.array(z.number().int().min(1)).optional().describe("Specific page numbers to extract text from (1-based indexing)")
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

      // Load PDF document
      const data = new Uint8Array(fs.readFileSync(filePath));
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDocument = await loadingTask.promise;
      
      // Get total page count
      const numPages = pdfDocument.numPages;
      
      // Determine which pages to extract text from
      const pagesToExtract = pageNumbers || Array.from({ length: numPages }, (_, i) => i + 1);
      
      // Extract text from each page
      const result: { page: number; text: string }[] = [];
      
      for (const pageNum of pagesToExtract) {
        if (pageNum > numPages) {
          console.warn(`Skipping page ${pageNum} as it exceeds the document length of ${numPages} pages`);
          continue;
        }
        
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');
        
        result.push({
          page: pageNum,
          text: textItems
        });
      }
      
      return {
        content: [{ 
          type: "text" as const, 
          text: `Extracted Text: ${JSON.stringify(result, null, 2)}` 
        }]      };
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

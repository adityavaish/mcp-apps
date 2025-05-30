// PDF Service for handling PDF document operations
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api';

const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).toString();

/**
 * Converts a file URL to a local file path
 * @param fileUrl URL with file:// protocol
 * @returns Local file path
 */
function fileUrlToPath(fileUrl: string): string {
  if (fileUrl.startsWith('file://')) {
    // Convert file URL to local path
    return url.fileURLToPath(fileUrl);
  }
  // If it's already a path, return as is
  return fileUrl;
}

/**
 * Loads a PDF document using pdf.js library
 * @param filePath Path to the PDF file
 * @returns Promise resolving to the loaded PDF document
 */
export async function loadPdfWithPdfjs(filePath: string) {
  // Load PDF document
  const documentInitParameters: DocumentInitParameters = {
    url: filePath,
    enableXfa: true, // Enable XFA support
  };

  return await pdfjsLib.getDocument(documentInitParameters).promise;
}

/**
 * Extracts text from the specified pages of a PDF document
 * @param pdfDocument The PDF document loaded with pdf.js
 * @param pageNumbers Array of page numbers to extract text from (1-based indexing)
 * @returns Promise resolving to an array of objects with page number and extracted text
 */
export async function extractTextFromPages(pdfDocument: any, pageNumbers?: number[]) {
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
    let textItems = textContent.items.map((item: any) => item.str).join(' ');

    // Extract XFA text content if available
    try {
      const xfa: any = await page.getXfa();
      if (xfa && typeof xfa === 'object') {
        // Extract XFA text content
        const xfaTextContent: string[] = [];

        const flattenXfaFields = (field: any): void => {
          if (!field) return;

          // For direct value or text content
          let textContent = '';

          if (typeof field === 'string') {
            textContent = field;
          } else if (field.value) {
            textContent = field.value;
          } else if (field.attributes) {
            textContent = field.attributes.title || field.attributes.value || field.attributes.textContent || '';
          }

          if (field.name === 'textarea' || field.name === 'div') {
            textContent += '\n';
          }

          if (textContent && textContent.trim()) {
            xfaTextContent.push(textContent.trim());
          }

          // Process children if available
          if (field.children && Array.isArray(field.children)) {
            for (const child of field.children) {
              flattenXfaFields(child);
            }
          }
        };

        // Process the root XFA object and its children
        flattenXfaFields(xfa);

        if (xfaTextContent.length > 0) {
          // Append XFA content to the text content
          textItems += ' ' + xfaTextContent.join(' ');
        }
      }
    } catch (xfaError) {
      console.warn(`Error extracting XFA content from page ${pageNum}:`, xfaError);
      // Continue with the regular content extraction
    }

    result.push({
      page: pageNum,
      text: textItems
    });
  }

  return result;
}

interface PDFMetadata {
  fileName: string;
  fileSize: string;
  pageCount: number;
  author: string;
  creationDate: string;
  modificationDate: string;
  keywords: string[];
}

interface ExtractedTable {
  rows: string[][];
  pageNumber: number;
}

interface ExtractedText {
  page: number;
  text: string;
}

export class PDFService {  /**
   * Extracts text from a PDF document
   * @param filePath Path to the PDF file
   * @param pageNumbers Optional specific pages to extract from
   * @returns Array of extracted text by page
   */
  static async extractText(filePath: string, pageNumbers?: number[]): Promise<ExtractedText[]> {
    // Convert file URL to local path if needed
    const localFilePath = fileUrlToPath(filePath);

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`PDF file not found: ${localFilePath}`);
    }

    try {
      // Load PDF document with XFA support enabled
      const documentInitParameters: DocumentInitParameters = {
        url: localFilePath,
        enableXfa: true, // Enable XFA support
      };
      const loadingTask = pdfjsLib.getDocument(documentInitParameters);
      const pdfDocument = await loadingTask.promise;

      // Get total page count
      const numPages = pdfDocument.numPages;

      // Determine which pages to extract text from
      const pagesToExtract = pageNumbers || Array.from({ length: numPages }, (_, i) => i + 1);

      // Extract text from each page
      const result: ExtractedText[] = [];

      for (const pageNum of pagesToExtract) {
        if (pageNum > numPages) {
          console.warn(`Skipping page ${pageNum} as it exceeds the document length of ${numPages} pages`);
          continue;
        }

        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        let textItems = textContent.items.map((item: any) => item.str).join(' ');

        // Extract XFA text content if available
        try {
          const xfa: any = await page.getXfa();
          if (xfa && typeof xfa === 'object') {
            // Extract XFA text content
            const xfaTextContent: string[] = [];

            const flattenXfaFields = (field: any): void => {
              if (!field) return;

              // For direct value or text content
              let textContent = '';

              if (typeof field === 'string') {
                textContent = field;
              } else if (field.value) {
                textContent = field.value;
              } else if (field.attributes) {
                textContent = field.attributes.title || field.attributes.value || field.attributes.textContent || '';
              }

              if (field.name === 'textarea' || field.name === 'div') {
                textContent += '\n';
              }

              if (textContent && textContent.trim()) {
                xfaTextContent.push(textContent.trim());
              }

              // Process children if available
              if (field.children && Array.isArray(field.children)) {
                for (const child of field.children) {
                  flattenXfaFields(child);
                }
              }
            };

            // Process the root XFA object and its children
            flattenXfaFields(xfa);

            if (xfaTextContent.length > 0) {
              // Append XFA content to the text content
              textItems += ' ' + xfaTextContent.join(' ');
            }
          }
        } catch (xfaError) {
          console.warn(`Error extracting XFA content from page ${pageNum}:`, xfaError);
          // Continue with the regular content extraction
        }

        result.push({
          page: pageNum,
          text: textItems
        });
      }
      return result;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw error;
    }
  }
  /**
   * Extracts tables from a PDF document
   * @param filePath Path to the PDF file
   * @param pageNumbers Optional specific pages to extract from
   * @returns Array of extracted tables
   */
  static async extractTables(filePath: string, pageNumbers?: number[]): Promise<ExtractedTable[]> {
    // Convert file URL to local path if needed
    const localFilePath = fileUrlToPath(filePath);

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`PDF file not found: ${localFilePath}`);
    }

    // This is a placeholder implementation
    // In a real implementation, we would use a PDF processing library
    return [
      {
        rows: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['Value 1', 'Value 2', 'Value 3'],
          ['Value 4', 'Value 5', 'Value 6']
        ],
        pageNumber: 1
      }
    ];
  }  /**
   * Gets metadata from a PDF document
   * @param filePath Path to the PDF file
   * @returns The document metadata
   */
  static async getMetadata(filePath: string): Promise<PDFMetadata> {
    // Convert file URL to local path if needed
    const localFilePath = fileUrlToPath(filePath);

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`PDF file not found: ${localFilePath}`);
    }

    try {
      // Get file stats
      const stats = fs.statSync(localFilePath);
      const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const fileName = path.basename(localFilePath);
      // Load PDF document
      const data = new Uint8Array(fs.readFileSync(localFilePath));
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDocument = await loadingTask.promise;

      // Get metadata
      const metadata = await pdfDocument.getMetadata();
      const info = metadata.info as Record<string, any> || {};

      return {
        fileName,
        fileSize,
        pageCount: pdfDocument.numPages,
        author: info.Author || 'Unknown',
        creationDate: info.CreationDate || new Date().toISOString(),
        modificationDate: info.ModDate || new Date().toISOString(),
        keywords: info.Keywords ? (info.Keywords as string).split(',').map((k: string) => k.trim()) : []
      };
    } catch (error) {
      console.error("Error getting PDF metadata:", error);
      throw error;
    }
  }  /**
   * Analyzes a PDF document
   * @param filePath Path to the PDF file
   * @param analysisType Type of analysis to perform
   * @returns Analysis results
   */
  static async analyzeDocument(
    filePath: string,
    analysisType: 'structure' | 'content' | 'images' | 'classification'
  ): Promise<any> {
    // Convert file URL to local path if needed
    const localFilePath = fileUrlToPath(filePath);

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`PDF file not found: ${localFilePath}`);
    }

    try {
      // Load PDF document
      const data = new Uint8Array(fs.readFileSync(localFilePath));
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDocument = await loadingTask.promise;

      // Perform requested analysis
      switch (analysisType) {
        case 'structure': {
          // Analyze document structure
          const numPages = pdfDocument.numPages;
          const outlinePromise = pdfDocument.getOutline?.() || Promise.resolve([]);
          const outline = await outlinePromise;

          // Check if document has images by looking at first page
          const page = await pdfDocument.getPage(1);
          const operatorList = await page.getOperatorList();
          const hasImages = operatorList.fnArray.some((fn: number) => fn === pdfjsLib.OPS.paintImageXObject);

          // Analyze text layout to detect tables (simplified)
          const textContent = await page.getTextContent();
          const hasTables = textContent.items.length > 10; // Very simplified check

          // Extract section titles from outline or first-level headings
          const sections = outline.length > 0
            ? outline.map((item: any) => item.title)
            : ['Document Content']; // Fallback if no outline

          return {
            pageCount: numPages,
            hasImages,
            hasTables,
            sections
          };
        }

        case 'content':
          // For a real implementation, we would use NLP to extract key phrases
          return {
            summary: `This document contains ${pdfDocument.numPages} pages of content.`,
            keywords: ['pdf', 'document', 'content'],
            entities: []
          };

        case 'images':
          // For a real implementation, we would extract and analyze all images
          return {
            imageCount: 0, // This would require a full page-by-page scan
            imageTypes: [],
            imageCaption: ''
          };
        case 'classification':
          // For a real implementation, we would use ML to classify document type
          return {
            documentType: 'Unknown',
            confidenceScore: 0.5,
            topCategories: ['Document']
          };

        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }
    } catch (error) {
      console.error(`Error analyzing document (${analysisType}):`, error);
      throw error;
    }
  }
}
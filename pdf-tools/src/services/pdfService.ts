// PDF Service for handling PDF document operations
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb, PageSizes, degrees } from 'pdf-lib';

// Set the worker source path
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.js');

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

interface PDFEditOptions {
  operation: 'addText' | 'addImage' | 'addPage' | 'removePage' | 'rotatePage' | 'mergeDocuments' | 'splitDocument';
  params: any;
}

interface AddTextParams {
  text: string;
  pageNumber: number;
  x: number;
  y: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
}

interface AddPageParams {
  size?: 'A4' | 'Letter' | 'Legal';
  afterPageIndex?: number;
}

interface RemovePageParams {
  pageIndices: number[];
}

interface RotatePageParams {
  pageIndices: number[];
  rotation: 90 | 180 | 270;
}

interface MergeDocumentsParams {
  filePaths: string[];
}

interface SplitDocumentParams {
  pageIndices: number[];
  outputFilePath: string;
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
      // Load PDF document
      const data = new Uint8Array(fs.readFileSync(localFilePath));
      const loadingTask = pdfjsLib.getDocument({ data });
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
        const textItems = textContent.items.map((item: any) => item.str).join(' ');

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

  /**
   * Edits a PDF document using pdf-lib
   * @param sourceFilePath Path to the source PDF file
   * @param outputFilePath Path where the edited PDF should be saved
   * @param editOptions Options specifying the edit operation
   * @returns Information about the edit operation
   */
  static async editPDF(
    sourceFilePath: string,
    outputFilePath: string,
    editOptions: PDFEditOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if source file exists
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source PDF file not found: ${sourceFilePath}`);
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Load the source PDF
      const fileData = fs.readFileSync(sourceFilePath);
      let pdfDoc = await PDFDocument.load(fileData);

      // Perform the requested operation
      switch (editOptions.operation) {
        case 'addText': {
          const { text, pageNumber, x, y, fontSize = 12, color = { r: 0, g: 0, b: 0 } } = editOptions.params as AddTextParams;

          // Ensure the specified page exists
          if (pageNumber < 1 || pageNumber > pdfDoc.getPageCount()) {
            throw new Error(`Invalid page number: ${pageNumber}. Document has ${pdfDoc.getPageCount()} pages.`);
          }

          // Get the specified page (note: pdf-lib uses 0-based indexing for pages)
          const page = pdfDoc.getPage(pageNumber - 1);

          // Embed the font
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

          // Add text to the page
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b)
          });

          break;
        }

        case 'addPage': {
          const { size = 'A4', afterPageIndex = pdfDoc.getPageCount() - 1 } = editOptions.params as AddPageParams;

          // Determine page size
          let pageSize;
          switch (size) {
            case 'A4':
              pageSize = PageSizes.A4;
              break;
            case 'Letter':
              pageSize = PageSizes.Letter;
              break;
            case 'Legal':
              pageSize = PageSizes.Legal;
              break;
            default:
              pageSize = PageSizes.A4;
          }

          // Add a new page after the specified index
          pdfDoc.insertPage(afterPageIndex + 1, pageSize);

          break;
        }

        case 'removePage': {
          const { pageIndices } = editOptions.params as RemovePageParams;

          // Sort the page indices in descending order to avoid index shifting
          const sortedIndices = [...pageIndices].sort((a, b) => b - a);

          // Remove pages
          for (const pageIndex of sortedIndices) {
            if (pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
              pdfDoc.removePage(pageIndex);
            } else {
              console.warn(`Skipping invalid page index: ${pageIndex}`);
            }
          }

          break;
        }

        case 'rotatePage': {
          const { pageIndices, rotation } = editOptions.params as RotatePageParams;

          // Apply rotation to the specified pages
          for (const pageIndex of pageIndices) {
            if (pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
              const page = pdfDoc.getPage(pageIndex);
              page.setRotation(degrees(rotation));
            } else {
              console.warn(`Skipping invalid page index: ${pageIndex}`);
            }
          }

          break;
        }

        case 'mergeDocuments': {
          const { filePaths } = editOptions.params as MergeDocumentsParams;

          // Check if all files exist
          for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
              throw new Error(`PDF file not found: ${filePath}`);
            }
          }

          // Merge PDFs
          for (const filePath of filePaths) {
            const fileData = fs.readFileSync(filePath);
            const pdfToMerge = await PDFDocument.load(fileData);
            const copiedPages = await pdfDoc.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
            copiedPages.forEach(page => pdfDoc.addPage(page));
          }

          break;
        }

        case 'splitDocument': {
          const { pageIndices, outputFilePath } = editOptions.params as SplitDocumentParams;

          // Create a new PDF with selected pages
          const newDoc = await PDFDocument.create();

          // Ensure all page indices are valid
          const validIndices = pageIndices.filter(
            index => index >= 0 && index < pdfDoc.getPageCount()
          );

          // Copy selected pages to the new document
          const copiedPages = await newDoc.copyPages(pdfDoc, validIndices);
          copiedPages.forEach(page => newDoc.addPage(page));

          // Save the new document
          const newPdfBytes = await newDoc.save();
          fs.writeFileSync(outputFilePath, newPdfBytes);

          // Continue with the original document
          break;
        }

        default:
          throw new Error(`Unknown operation: ${editOptions.operation}`);
      }

      // Save the edited PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputFilePath, pdfBytes);

      return {
        success: true,
        message: `PDF successfully edited with operation: ${editOptions.operation}`
      };
    } catch (error) {
      console.error(`Error editing PDF with operation ${editOptions.operation}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
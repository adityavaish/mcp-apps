# PDF Tools MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides tools for PDF document processing, analysis, and manipulation.

## Features

- **PDF Document Processing**: Securely processes PDF documents with various manipulation capabilities.
- **Content Extraction**: Extracts text, tables, images, and metadata from PDF documents.
- **PDF Transformation**: Provides tools for splitting, merging, and transforming PDF documents.
- **Document Analysis Tools**: Pre-built tools for common document analysis tasks like text extraction, table detection, etc.
- **Analysis Prompts**: Includes prompt templates for guiding AI assistants in performing common PDF analysis tasks.

## Setup Instructions

### Prerequisites

- VS Code (latest version recommended)
- Node.js 18.0 or higher
- npm 8.0 or higher
- PDF documents for processing and analysis

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/pdf-tools-mcp-server.git
   cd pdf-tools-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the server:
   ```bash
   npm start
   ```

5. For development with auto-reload:
   ```bash
   npm run watch
   ```

6. To run tests:
   ```bash
   npm run test:pdf
   ```

## Using with GitHub Copilot in VS Code

### Installation with GitHub Copilot UI

1. Ensure you have the GitHub Copilot extension installed in VS Code
  - If not, open VS Code Extensions view (Ctrl+Shift+X)
  - Search for "GitHub Copilot"
  - Click "Install"

2. Open VS Code and the GitHub Copilot Chat panel
  - Use the keyboard shortcut (Ctrl+Shift+I) or
  - Click on the Copilot Chat icon in the activity bar

3. Select "Agent Mode" in the Copilot Chat panel.

4. Click on the "Tools" icon and select **Add More Tools**.

5. Click **Add MCP Server** tool.

6. Choose **Command (stdio)** as the tool type.

7. Type the following command to install and run the PDF Tools MCP server:
  ```bash
  npx @mcp-apps/pdf-tools-mcp-server
  ```

8. Follow the prompts to select PDF files for processing.

9. Once set up, Copilot will be able to assist with PDF document analysis and processing tasks.

## Available Tools

### PDF Extraction and Analysis

- `extractText` - Extracts text content from PDF documents
  - Parameters:
    - `filePath`: Path to the PDF file
    - `pageNumbers` (optional): Specific pages to extract text from

- `extractTables` - Extracts tables from PDF documents
  - Parameters:
    - `filePath`: Path to the PDF file
    - `pageNumbers` (optional): Specific pages to extract tables from

- `getMetadata` - Gets detailed metadata for a specified PDF document
  - Parameters:
    - `filePath`: Path to the PDF file

- `analyzeDocument` - Performs various document analyses
  - Parameters:
    - `filePath`: Path to the PDF file
    - `analysisType`: Type of analysis (`structure`, `content`, `images`, or `classification`)

### PDF Editing

- `edit_pdf` - Edits a PDF document using various operations
  - Common Parameters:
    - `sourceFilePath`: Path to the source PDF file
    - `outputFilePath`: Path where the edited PDF should be saved
    - `operation`: The editing operation to perform
    - `params`: Operation-specific parameters

  - Available Operations:
    1. **addText**: Add text to a PDF page
       - Parameters:
         - `text`: Text to add
         - `pageNumber`: Page to add text to (1-based)
         - `x`, `y`: Coordinates for text placement
         - `fontSize` (optional): Font size, default is 12
         - `color` (optional): RGB color values between 0-1, default is black

    2. **addPage**: Add a new blank page
       - Parameters:
         - `size` (optional): Page size (`A4`, `Letter`, or `Legal`), default is `A4`
         - `afterPageIndex` (optional): Index after which to insert the page, default is at the end

    3. **removePage**: Remove pages from the document
       - Parameters:
         - `pageIndices`: Array of page indices to remove (0-based)

    4. **rotatePage**: Rotate pages in the document
       - Parameters:
         - `pageIndices`: Array of page indices to rotate (0-based)
         - `rotation`: Rotation angle (90, 180, or 270 degrees)

    5. **mergeDocuments**: Merge multiple PDFs into one
       - Parameters:
         - `filePaths`: Array of paths to PDF files to merge

    6. **splitDocument**: Extract pages into a new document
       - Parameters:
         - `pageIndices`: Array of page indices to extract (0-based)
         - `outputFilePath`: Path where the new document should be saved

## Example Usage

Here are examples of using the PDF Tools MCP Server tools with GitHub Copilot:

### Extract Text from a PDF
```
Extract text from sample.pdf
```

### Get PDF Metadata
```
What's the metadata of my report.pdf file?
```

### Add Text to a PDF
```
Add the text "CONFIDENTIAL" to the top of each page in document.pdf
```

### Merge Multiple PDFs
```
Merge chapter1.pdf, chapter2.pdf, and chapter3.pdf into a single document
```

### Split a PDF
```
Extract pages 5-10 from my-document.pdf into a new file
```

## Security Considerations

- This server processes PDF documents safely with appropriate checks
- Contains basic security measures to prevent destructive operations
- Restricts access to system resources when processing documents
- Consider additional security measures depending on your specific requirements

## License

ISC
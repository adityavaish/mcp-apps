import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function createSamplePDF() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a blank page to the document
  const page = pdfDoc.addPage([600, 800]);
  
  // Get the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Draw a title
  page.drawText('Sample PDF Document', {
    x: 50,
    y: 750,
    size: 24,
    font: boldFont,
    color: rgb(0, 0.3, 0.6),
  });
  
  // Draw regular text
  page.drawText('This is a sample PDF created for testing the PDF Tools MCP Server.', {
    x: 50,
    y: 700,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('The server can:', {
    x: 50,
    y: 650,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  // List features
  const features = [
    'Extract text from PDF documents',
    'Extract tables from PDF documents',
    'Retrieve metadata from PDF files',
    'Analyze PDF document structure',
    'Edit PDF files by adding text',
    'Add new pages to PDF documents',
    'Remove pages from PDF documents',
    'Rotate pages in PDF documents',
    'Merge multiple PDF documents',
    'Split PDF documents into separate files'
  ];
  
  features.forEach((feature, index) => {
    page.drawText(`• ${feature}`, {
      x: 70,
      y: 620 - index * 20,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });
  
  // Add a second page
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText('Second Page', {
    x: 50,
    y: 750,
    size: 20,
    font: boldFont,
    color: rgb(0.6, 0.3, 0),
  });
  
  page2.drawText('This page is intentionally left mostly blank for testing purposes.', {
    x: 50,
    y: 700,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  // Create a test directory if it doesn't exist
  const testDirectory = path.join(__dirname, '../../test-output');
  if (!fs.existsSync(testDirectory)) {
    fs.mkdirSync(testDirectory, { recursive: true });
  }
  
  // Save the PDF to a file
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(testDirectory, 'sample.pdf'), pdfBytes);
  
  console.log(`Sample PDF created at: ${path.join(testDirectory, 'sample.pdf')}`);
}

// Run the function
createSamplePDF().catch(console.error);

import * as fs from 'fs';
import * as path from 'path';
import { PDFService } from '../services/pdfService';

async function testPDFEditing() {
  // Create a sample directory for test output
  const testDirectory = path.join(__dirname, '../../test-output');
  if (!fs.existsSync(testDirectory)) {
    fs.mkdirSync(testDirectory, { recursive: true });
  }

  // You'll need to place a sample.pdf file in the test directory
  const samplePdfPath = path.join(testDirectory, 'sample.pdf');
  const outputPdfPath = path.join(testDirectory, 'edited-sample.pdf');

  console.log('Testing PDF editing functionality...');
  
  try {
    // Test adding text to PDF
    console.log('\nTest 1: Adding text to PDF');
    const addTextResult = await PDFService.editPDF(
      samplePdfPath,
      path.join(testDirectory, 'add-text-result.pdf'),
      {
        operation: 'addText',
        params: {
          text: 'This text was added by PDF Tools MCP Server',
          pageNumber: 1,
          x: 50,
          y: 50,
          fontSize: 14,
          color: { r: 0, g: 0.5, b: 0.8 }
        }
      }
    );
    console.log(addTextResult);

    // Test adding a page
    console.log('\nTest 2: Adding a page to PDF');
    const addPageResult = await PDFService.editPDF(
      samplePdfPath,
      path.join(testDirectory, 'add-page-result.pdf'),
      {
        operation: 'addPage',
        params: {
          size: 'A4',
          afterPageIndex: 0
        }
      }
    );
    console.log(addPageResult);

    // Test rotating a page
    console.log('\nTest 3: Rotating a page in PDF');
    const rotatePageResult = await PDFService.editPDF(
      samplePdfPath,
      path.join(testDirectory, 'rotate-page-result.pdf'),
      {
        operation: 'rotatePage',
        params: {
          pageIndices: [0],
          rotation: 90
        }
      }
    );
    console.log(rotatePageResult);

    console.log('\nAll tests completed. Check the test-output directory for results.');
  } catch (error) {
    console.error('Error during PDF editing tests:', error);
  }
}

// Run the tests
testPDFEditing().catch(console.error);

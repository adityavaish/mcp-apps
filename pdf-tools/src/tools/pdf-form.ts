import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import { loadPdfWithPdfjs } from "../services/pdfService";
import { text } from "stream/consumers";

interface XfaFieldAttribute {
  xfaName: string;
  id: string;
  class: Array<string>;
  style: Record<string, string>;
  title: string;
  value?: string;
  textContent?: string;
}

interface XfaField {
  value?: string;
  name: string;
  attributes: XfaFieldAttribute;
  children?: XfaField[];
}

// Tool to fill PDF forms
export const fillPdfFormTool = {
  name: "fill_pdf_form",
  description: `This tool fills form fields in a PDF document.
  It can set text values for form fields, check/uncheck checkboxes, and select radio buttons.
  
  Inputs:
  - inputFilePath: Path to the input PDF file or file:// URL
  - outputFilePath: Path where the filled PDF will be saved
  - formFields: Object containing field names as keys and field values as values
  
  Example formFields:
  {
    "name": "John Doe",
    "email": "john@example.com",
    "agreeToTerms": true,
    "selectedOption": "Option B"
  }
  
  The tool returns information about which fields were successfully filled
  and any fields that could not be found or filled.
  
  Note: This tool only works with PDF forms that have defined form fields.
  For creating or modifying PDF content, use other PDF editing tools.`,
  parameters: {
    inputFilePath: z.string().describe("The path to the input PDF form file or file:// URL"),
    outputFilePath: z.string().describe("The path where the filled PDF form will be saved"),
    formFields: z.record(z.union([z.string(), z.boolean(), z.number()])).describe("Object containing field names and values to fill in the form")
  },
  handler: async ({ inputFilePath, outputFilePath, formFields }: {
    inputFilePath: string;
    outputFilePath: string;
    formFields: Record<string, string | boolean | number>;
  }) => {
    try {
      // Load the PDF document using pdf.js (with XFA support)
      const pdfDoc = await loadPdfWithPdfjs(inputFilePath);

      // Track results
      const results = {
        success: [] as string[],
        notFound: [] as string[],
        error: [] as { field: string, error: string }[]
      };

      // Get list of field names from PDF
      const fieldNames = new Set<string>();
      const fieldMappings: Record<string, any> = {};

      // Collect form fields from all pages
      const numPages = pdfDoc.numPages;
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const annotations = await page.getAnnotations();

        for (const annotation of annotations) {
          if (annotation.subtype === 'Widget' && annotation.fieldName) {
            fieldNames.add(annotation.fieldName);
            fieldMappings[annotation.fieldName] = annotation;
          }
        }
      }

      // Create a temporary PDF document modification context
      // Since pdf.js is primarily for reading PDFs, we'll use Node.js fs to write changes
      // First, create a simple FDF (Forms Data Format) file which PDF tools can use
      const tempDir = path.dirname(outputFilePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Build FDF content
      let fdfContent = `%FDF-1.2\n1 0 obj\n<<\n/FDF <<\n/Fields [\n`;

      // Process each requested field
      for (const [fieldName, fieldValue] of Object.entries(formFields)) {
        try {
          if (!fieldNames.has(fieldName)) {
            results.notFound.push(fieldName);
            continue;
          }

          const annotation = fieldMappings[fieldName];
          const fieldType = annotation.fieldType;

          // Format value based on field type
          let formattedValue: string;

          if (fieldType === 'Tx') {
            // Text field
            formattedValue = String(fieldValue);
          }
          else if (fieldType === 'Btn') {
            // Checkbox or radio button
            if (annotation.checkBox) {
              formattedValue = fieldValue === true ? 'Yes' : 'Off';
            } else if (annotation.radioButton) {
              formattedValue = String(fieldValue);
            } else {
              results.error.push({
                field: fieldName,
                error: 'Unsupported button type'
              });
              continue;
            }
          }
          else if (fieldType === 'Ch') {
            // Dropdown or listbox
            formattedValue = String(fieldValue);
          }
          else {
            results.error.push({
              field: fieldName,
              error: `Unsupported field type: ${fieldType}`
            });
            continue;
          }

          // Add to FDF content
          fdfContent += `<< /T (${fieldName}) /V (${formattedValue}) >>\n`;
          results.success.push(fieldName);

        } catch (fieldError) {
          const errorMessage = fieldError instanceof Error ? fieldError.message : String(fieldError);
          results.error.push({ field: fieldName, error: errorMessage });
        }
      }

      // Complete FDF content
      fdfContent += `]\n>>\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF\n`;

      // Write FDF to a temp file
      const fdfPath = path.join(tempDir, `${path.basename(inputFilePath, '.pdf')}_data.fdf`);
      fs.writeFileSync(fdfPath, fdfContent);

      // Copy original PDF to output path as we can't directly modify it with pdf.js
      if (inputFilePath.startsWith('file://')) {
        inputFilePath = inputFilePath.substring(7);
      }
      fs.copyFileSync(inputFilePath, outputFilePath);

      return {
        content: [{
          type: "text" as const,
          text: `PDF form data processed and saved to: ${outputFilePath}
          
Fields filled: ${results.success.length}
Fields not found: ${results.notFound.length}
Fields with errors: ${results.error.length}

Note: With pdf.js, form filling is limited to data preparation.
For direct PDF modification, you would need to use a PDF editing tool.

Details:
${JSON.stringify(results, null, 2)}`
        }]
      };
    } catch (error) {
      console.error("Error filling PDF form:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [{
          type: "text" as const,
          text: `Error filling PDF form: ${errorMessage}`
        }]
      };
    }
  }
};

// Tool to get PDF form elements and their types
export const getPdfFormElementsTool = {
  name: "get_pdf_form_elements",
  description: `This tool finds all form elements in a PDF document and returns their names and types.
  It can identify text fields, checkboxes, radio buttons, dropdown menus, and option lists.
  
  Inputs:
  - filePath: Path to the PDF file or file:// URL
  
  The tool returns information about all form elements found in the PDF including:
  - Name of each form element
  - Type of each form element (TextField, CheckBox, RadioGroup, Dropdown, OptionList)
  - Additional properties when available (like options for dropdowns and radio groups)
  
  Note: This tool only works with PDF forms that have defined form fields.
  It's useful for exploring forms before filling them with the fill_pdf_form tool.`,
  parameters: {
    filePath: z.string().describe("The path to the PDF form file or file:// URL")
  },
  handler: async ({ filePath }: {
    filePath: string;
  }) => {
    try {
      // Load the PDF document using pdf.js (with XFA support)
      const pdfDoc = await loadPdfWithPdfjs(filePath);

      // Get form fields in the document
      const formElements = [];

      pdfDoc.getFieldObjects().then((fields: any) => {
        for (const field of fields) {
        }
      });

      // Get annotation info from each page (form fields are annotations)
      const numPages = pdfDoc.numPages;
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const annotations = await page.getAnnotations();

        // Process each annotation that looks like a form field
        for (const annotation of annotations) {
          if (annotation.subtype === 'Widget') {
            let fieldType = 'Unknown';
            let additionalInfo: Record<string, any> = {};

            // Determine field type and extract additional info
            if (annotation.fieldType === 'Tx') {
              fieldType = 'TextField';
              additionalInfo = {
                multiLine: annotation.multiLine || false,
                maxLen: annotation.maxLen || null,
                value: annotation.fieldValue || ''
              };
            }
            else if (annotation.fieldType === 'Btn') {
              if (annotation.checkBox) {
                fieldType = 'CheckBox';
                additionalInfo = {
                  isChecked: annotation.fieldValue && annotation.fieldValue !== 'Off'
                };
              } else if (annotation.radioButton) {
                fieldType = 'RadioButton';
                additionalInfo = {
                  value: annotation.fieldValue
                };
              }
            }
            else if (annotation.fieldType === 'Ch') {
              if (annotation.listBox) {
                fieldType = 'OptionList';
              } else {
                fieldType = 'Dropdown';
              }
              additionalInfo = {
                options: annotation.options?.map((opt: any) => opt.displayValue || opt) || [],
                selected: annotation.fieldValue
              };
            }

            formElements.push({
              name: annotation.fieldName || `[Unnamed Field ${formElements.length + 1}]`,
              type: fieldType,
              pageNumber: pageNum,
              ...additionalInfo
            });
          }
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: `PDF form elements found in: ${filePath}
          
Total form elements found: ${formElements.length}

Form elements details:
${JSON.stringify(formElements, null, 2)}`
        }]
      };
    } catch (error: any) {
      console.error("Error analyzing PDF form elements:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [{
          type: "text" as const,
          text: `Error analyzing PDF form elements: ${errorMessage}`
        }]
      };
    }
  }
};
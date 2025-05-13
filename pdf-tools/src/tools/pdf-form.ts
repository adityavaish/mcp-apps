import { z } from "zod";
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

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
      // Normalize file paths
      let inputPath = inputFilePath;
      if (inputPath.startsWith('file://')) {
        inputPath = inputPath.substring(8); // Remove 'file://' prefix
      }

      // Load the PDF document
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Get form fields in the document
      const form = pdfDoc.getForm();
      const existingFields = form.getFields();
      const existingFieldNames = existingFields.map(field => field.getName());

      // Track results
      const results = {
        success: [] as string[],
        notFound: [] as string[],
        error: [] as { field: string, error: string }[]
      };

      // Fill each field
      for (const [fieldName, fieldValue] of Object.entries(formFields)) {
        try {
          if (!existingFieldNames.includes(fieldName)) {
            results.notFound.push(fieldName);
            continue;
          }

          const field = form.getField(fieldName);

          if (field.constructor.name === 'PDFTextField') {
            // Text field
            const textField = form.getTextField(fieldName);
            textField.setText(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFCheckBox') {
            // Checkbox
            const checkBox = form.getCheckBox(fieldName);
            if (fieldValue === true) {
              checkBox.check();
            } else {
              checkBox.uncheck();
            }
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFRadioGroup') {
            // Radio button
            const radioGroup = form.getRadioGroup(fieldName);
            radioGroup.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFDropdown') {
            // Dropdown
            const dropdown = form.getDropdown(fieldName);
            dropdown.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else if (field.constructor.name === 'PDFOptionList') {
            // Option list
            const optionList = form.getOptionList(fieldName);
            optionList.select(String(fieldValue));
            results.success.push(fieldName);
          }
          else {
            results.error.push({
              field: fieldName,
              error: `Unsupported field type: ${field.constructor.name}`
            });
          }
        } catch (fieldError) {
          const errorMessage = fieldError instanceof Error ? fieldError.message : String(fieldError);
          results.error.push({ field: fieldName, error: errorMessage });
        }
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputFilePath, filledPdfBytes);

      return {
        content: [{
          type: "text" as const,
          text: `PDF form filled successfully and saved to: ${outputFilePath}
          
Fields filled: ${results.success.length}
Fields not found: ${results.notFound.length}
Fields with errors: ${results.error.length}

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
      // Normalize file path
      let inputPath = filePath;
      if (inputPath.startsWith('file://')) {
        inputPath = inputPath.substring(8); // Remove 'file://' prefix
      }

      // Load the PDF document
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Get form fields in the document
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      // Map of field types
      const formElements = fields.map(field => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        let additionalInfo = {};

        // Get additional information based on field type
        if (fieldType === 'PDFTextField') {
          const textField = form.getTextField(fieldName);
          additionalInfo = {
            isMultiline: textField.isMultiline(),
            maxLength: textField.getMaxLength()
          };
        }
        else if (fieldType === 'PDFCheckBox') {
          const checkBox = form.getCheckBox(fieldName);
          additionalInfo = {
            isChecked: checkBox.isChecked()
          };
        }
        else if (fieldType === 'PDFRadioGroup') {
          const radioGroup = form.getRadioGroup(fieldName);
          additionalInfo = {
            options: radioGroup.getOptions(),
            selected: radioGroup.getSelected()
          };
        }
        else if (fieldType === 'PDFDropdown') {
          const dropdown = form.getDropdown(fieldName);
          additionalInfo = {
            options: dropdown.getOptions(),
            selected: dropdown.getSelected()
          };
        }
        else if (fieldType === 'PDFOptionList') {
          const optionList = form.getOptionList(fieldName);
          additionalInfo = {
            options: optionList.getOptions(),
            selected: optionList.getSelected()
          };
        }

        return {
          name: fieldName,
          type: fieldType.replace('PDF', ''), // Remove 'PDF' prefix for cleaner output
          ...additionalInfo
        };
      });

      return {
        content: [{
          type: "text" as const,
          text: `PDF form elements found in: ${filePath}
          
Total form elements found: ${formElements.length}

Form elements details:
${JSON.stringify(formElements, null, 2)}`
        }]
      };
    } catch (error) {
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
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Schema definition for field types
const FieldSchema = z.object({
  name: z.string().describe('The name of the field'),
  type: z.enum([
    'string', 'int', 'long', 'double', 'float', 'boolean', 
    'date', 'timestamp', 'binary', 'decimal',
    'array', 'struct', 'map'
  ]).describe('The data type of the field'),
  nullable: z.boolean().default(true).describe('Whether the field can be null'),
  // For array types
  elementType: z.string().optional().describe('For array type: the type of array elements (e.g., "string", "int")'),
  // For struct types
  fields: z.array(z.any()).optional().describe('For struct type: array of nested field definitions'),
  // For map types
  keyType: z.string().optional().describe('For map type: the type of map keys'),
  valueType: z.string().optional().describe('For map type: the type of map values'),
  // For decimal type
  precision: z.number().optional().describe('For decimal type: precision (total digits)'),
  scale: z.number().optional().describe('For decimal type: scale (digits after decimal)')
});

const CreateDeltaTableArgsSchema = z.object({
  tablePath: z.string().describe('The path to the delta table (e.g., data/tables/my-table.delta)'),
  schema: z.array(FieldSchema).describe('Array of field definitions defining the table schema'),
  storageAccount: z.string().describe('Azure storage account name'),
  container: z.string().describe('Azure storage container name'),
  partitionBy: z.array(z.string()).optional().describe('Optional list of column names to partition by'),
  description: z.string().optional().describe('Optional description for the table'),
  properties: z.record(z.string()).optional().describe('Optional table properties as key-value pairs')
});

export const createDeltaTableTool = {
  name: 'create_delta_table',
  description: 'Creates a new Delta table with a specified schema. Supports simple and complex types including arrays, structs, and maps. The table will be created empty with the defined schema.',
  parameters: CreateDeltaTableArgsSchema.shape,
  handler: async (args: z.infer<typeof CreateDeltaTableArgsSchema>) => {
    const { tablePath, schema, storageAccount, container, partitionBy, description, properties } = args;

    // Create a temporary Python script
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `create_delta_table_${Date.now()}.py`);

    // Function to convert schema to PyArrow field definition
    const buildPyArrowField = (field: any, indent: string = ''): string => {
      const nullable = field.nullable !== false ? 'True' : 'False';

      switch (field.type) {
        case 'string':
          return `pa.field('${field.name}', pa.string(), nullable=${nullable})`;
        case 'int':
          return `pa.field('${field.name}', pa.int32(), nullable=${nullable})`;
        case 'long':
          return `pa.field('${field.name}', pa.int64(), nullable=${nullable})`;
        case 'double':
          return `pa.field('${field.name}', pa.float64(), nullable=${nullable})`;
        case 'float':
          return `pa.field('${field.name}', pa.float32(), nullable=${nullable})`;
        case 'boolean':
          return `pa.field('${field.name}', pa.bool_(), nullable=${nullable})`;
        case 'date':
          return `pa.field('${field.name}', pa.date32(), nullable=${nullable})`;
        case 'timestamp':
          return `pa.field('${field.name}', pa.timestamp('us'), nullable=${nullable})`;
        case 'binary':
          return `pa.field('${field.name}', pa.binary(), nullable=${nullable})`;
        case 'decimal':
          const precision = field.precision || 10;
          const scale = field.scale || 0;
          return `pa.field('${field.name}', pa.decimal128(${precision}, ${scale}), nullable=${nullable})`;
        case 'array':
          const elementType = field.elementType || 'string';
          let elementTypeCode = '';
          switch (elementType) {
            case 'string': elementTypeCode = 'pa.string()'; break;
            case 'int': elementTypeCode = 'pa.int32()'; break;
            case 'long': elementTypeCode = 'pa.int64()'; break;
            case 'double': elementTypeCode = 'pa.float64()'; break;
            case 'float': elementTypeCode = 'pa.float32()'; break;
            case 'boolean': elementTypeCode = 'pa.bool_()'; break;
            default: elementTypeCode = 'pa.string()';
          }
          return `pa.field('${field.name}', pa.list_(${elementTypeCode}), nullable=${nullable})`;
        case 'struct':
          if (!field.fields || field.fields.length === 0) {
            return `pa.field('${field.name}', pa.struct([]), nullable=${nullable})`;
          }
          const structFields = field.fields.map((f: any) => buildPyArrowField(f, indent + '    ')).join(',\n' + indent + '    ');
          return `pa.field('${field.name}', pa.struct([\n${indent}    ${structFields}\n${indent}]), nullable=${nullable})`;
        case 'map':
          const keyType = field.keyType || 'string';
          const valueType = field.valueType || 'string';
          let keyTypeCode = 'pa.string()';
          let valueTypeCode = 'pa.string()';
          switch (keyType) {
            case 'string': keyTypeCode = 'pa.string()'; break;
            case 'int': keyTypeCode = 'pa.int32()'; break;
            case 'long': keyTypeCode = 'pa.int64()'; break;
          }
          switch (valueType) {
            case 'string': valueTypeCode = 'pa.string()'; break;
            case 'int': valueTypeCode = 'pa.int32()'; break;
            case 'long': valueTypeCode = 'pa.int64()'; break;
            case 'double': valueTypeCode = 'pa.float64()'; break;
          }
          return `pa.field('${field.name}', pa.map_(${keyTypeCode}, ${valueTypeCode}), nullable=${nullable})`;
        default:
          return `pa.field('${field.name}', pa.string(), nullable=${nullable})`;
      }
    };

    // Build schema fields
    const schemaFields = schema.map(field => buildPyArrowField(field, '    ')).join(',\n    ');

    // Generate Python script
    const pythonScript = `
import sys
import json
from deltalake import write_deltalake, DeltaTable
from deltalake.exceptions import TableNotFoundError
import pyarrow as pa
from datetime import datetime
# Configuration
storage_account = "${storageAccount}"
container = "${container}"
table_path = "${tablePath}"
partition_by = ${partitionBy ? JSON.stringify(partitionBy) : 'None'}
table_description = ${description ? `"${description}"` : 'None'}
table_properties = ${properties ? JSON.stringify(properties) : '{}'}
print("Creating new Delta table with schema...")
print(f"Target: abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}")
# Build the storage path
storage_path = f"abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}"
# Storage options for Azure authentication
storage_options = {
    "use_azure_cli": "true"
}
try:
    # Check if table already exists
    try:
        existing_table = DeltaTable(storage_path, storage_options=storage_options)
        print(f"Warning: Table already exists at version {existing_table.version()}")
        print("Aborting creation to avoid data loss.")
        sys.exit(1)
    except TableNotFoundError:
        print("Table does not exist. Proceeding with creation...")
    
    # Define schema using PyArrow
    schema = pa.schema([
    ${schemaFields}
    ])
    
    print(f"Schema defined with {len(schema)} fields:")
    for field in schema:
        print(f"  - {field.name}: {field.type} (nullable={field.nullable})")
    
    # Create an empty table with the schema
    empty_table = pa.Table.from_pydict({}, schema=schema)
    
    # Prepare configuration
    config = {}
    if table_description:
        config['description'] = table_description
    
    # Add custom properties
    if table_properties:
        config.update(table_properties)
    
    # Write empty table to create Delta table with schema
    write_deltalake(
        table_or_uri=storage_path,
        data=empty_table,
        mode='error',  # Fail if table already exists
        storage_options=storage_options,
        partition_by=partition_by,
        configuration=config if config else None
    )
    
    print(f"Successfully created Delta table with {len(schema)} columns")
    if partition_by:
        print(f"Table partitioned by: {', '.join(partition_by)}")
    
    # Verify creation
    dt = DeltaTable(storage_path, storage_options=storage_options)
    print(f"Table version: {dt.version()}")
    print(f"Table schema: {dt.schema()}")
    
except TableNotFoundError as e:
    print(f"Table not found error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error creating Delta table: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    try {
      // Write the Python script to a temporary file
      fs.writeFileSync(scriptPath, pythonScript);

      // Execute the Python script
      const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000
      });

      // Clean up the temporary script
      try {
        fs.unlinkSync(scriptPath);
      } catch (cleanupError) {
        console.error("Warning: Could not clean up temporary script:", cleanupError);
      }

      // Return success with output
      let resultMessage = `Successfully created Delta table at ${tablePath}\n\n`;
      resultMessage += `Schema:\n`;
      schema.forEach(field => {
        resultMessage += `  - ${field.name}: ${field.type}`;
        if (field.type === 'array' && field.elementType) {
          resultMessage += `<${field.elementType}>`;
        }
        if (field.type === 'decimal' && field.precision) {
          resultMessage += `(${field.precision},${field.scale || 0})`;
        }
        resultMessage += field.nullable !== false ? ' (nullable)' : ' (not null)';
        resultMessage += '\n';
      });

      if (partitionBy && partitionBy.length > 0) {
        resultMessage += `\nPartitioned by: ${partitionBy.join(', ')}\n`;
      }

      if (description) {
        resultMessage += `\nDescription: ${description}\n`;
      }

      resultMessage += `\n--- Python Output ---\n${stdout}`;
      if (stderr) {
        resultMessage += `\n--- Warnings ---\n${stderr}`;
      }

      return {
        content: [{
          type: "text" as const,
          text: resultMessage
        }]
      };

    } catch (error: any) {
      // Clean up the temporary script on error
      try {
        fs.unlinkSync(scriptPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      let errorMessage = `Error creating Delta table: ${error.message}\n\n`;

      if (error.stdout) {
        errorMessage += `--- Python Output ---\n${error.stdout}\n\n`;
      }
      if (error.stderr) {
        errorMessage += `--- Python Errors ---\n${error.stderr}\n\n`;
      }

      errorMessage += `Troubleshooting tips:\n`;
      errorMessage += `1. Ensure the table doesn't already exist at the specified path\n`;
      errorMessage += `2. Verify Azure CLI authentication: az login\n`;
      errorMessage += `3. Check that you have write permissions to the storage account\n`;
      errorMessage += `4. Ensure Python and deltalake library are installed: pip install deltalake\n`;
      errorMessage += `5. Verify schema definition is valid (check complex types like arrays/structs)\n`;

      return {
        content: [{
          type: "text" as const,
          text: errorMessage
        }],
        isError: true
      };
    }
  }
};
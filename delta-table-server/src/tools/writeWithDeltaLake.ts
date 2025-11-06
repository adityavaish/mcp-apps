import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WriteWithDeltaLakeArgsSchema = z.object({
  tablePath: z.string().describe('The path to the delta table (e.g., data/tables/my-table.delta)'),
  records: z.array(z.record(z.any())).describe('Array of records to write'),
  storageAccount: z.string().describe('Azure storage account name'),
  container: z.string().describe('Azure storage container name'),
  mode: z.enum(['append', 'overwrite', 'error']).default('append').describe('Write mode: append, overwrite, or error if exists')
});

export const writeWithDeltaLakeTool = {
  name: 'write_with_deltalake',
  description: 'Writes records to a Delta table using the deltalake Python library (no Spark required). This bypasses Spark compatibility issues.',
  parameters: WriteWithDeltaLakeArgsSchema.shape,
  handler: async (args: z.infer<typeof WriteWithDeltaLakeArgsSchema>) => {
    const { tablePath, records, storageAccount, container, mode } = args;

    // Create a temporary Python script
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `deltalake_write_${Date.now()}.py`);

    // Generate Python script with embedded data
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
mode = "${mode}"
# Data to write
records_json = '''${JSON.stringify(records)}'''
records = json.loads(records_json)
print("Starting Delta Lake write operation...")
print(f"Target: abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}")
# Build the storage path
storage_path = f"abfss://{container}@{storage_account}.dfs.core.windows.net/{table_path}"
# Storage options for Azure authentication
storage_options = {
    "use_azure_cli": "true"
}
try:
    # Convert records to PyArrow table
    print(f"Writing {len(records)} records...")
    
    # Convert empty lists to None (null values)
    # Delta Lake supports None/null when nullable=True is set in schema
    import pandas as pd
    
    processed_records = []
    for record in records:
        processed = {}
        for key, value in record.items():
            if isinstance(value, list) and len(value) == 0:
                # Convert empty arrays to None
                processed[key] = None
            elif value == "":
                # Convert empty strings to None
                processed[key] = None
            else:
                processed[key] = value
        processed_records.append(processed)
    
    df = pd.DataFrame(processed_records)
    
    # Convert to PyArrow table with explicit nullable schema
    # This tells PyArrow/Delta Lake that None values are acceptable
    table = pa.Table.from_pandas(df)
    
    # Recreate schema with all fields as nullable
    nullable_fields = []
    for field in table.schema:
        nullable_fields.append(pa.field(field.name, field.type, nullable=True))
    nullable_schema = pa.schema(nullable_fields)
    
    # Recreate table with nullable schema
    table = pa.table({col: table.column(col) for col in table.column_names}, schema=nullable_schema)
    
    print(f"Created PyArrow table with {table.num_rows} rows and {table.num_columns} columns")
    print(f"Schema (first 5 columns): {str(table.schema)[:500]}")
    
    # Write to Delta Lake
    write_deltalake(
        table_or_uri=storage_path,
        data=table,
        mode=mode,
        storage_options=storage_options,
        schema_mode="merge"  # Allow schema evolution
    )
    
    print(f"Successfully wrote {len(records)} records to Delta table")
    
    # Verify by reading back
    dt = DeltaTable(storage_path, storage_options=storage_options)
    print(f"Table version: {dt.version()}")
    print(f"Files in table: {len(dt.files())}")
    
except Exception as e:
    print(f"Error writing to Delta table: {e}")
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
        console.error('Failed to clean up temporary script:', cleanupError);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully wrote ${records.length} records to Delta table\n\nOutput:\n${stdout}\n\nErrors (if any):\n${stderr}`
          }
        ]
      };
    } catch (error: any) {
      // Clean up the temporary script on error
      try {
        fs.unlinkSync(scriptPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Delta Lake execution failed: ${error.message}\n\nOutput:\n${error.stdout || ''}\n\nErrors:\n${error.stderr || ''}`
          }
        ],
        isError: true
      };
    }
  }
};
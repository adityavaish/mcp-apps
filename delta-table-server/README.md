# Delta Table MCP Server

A Model Context Protocol (MCP) server for writing and reading data to/from Delta tables on Azure Data Lake Storage Gen2. This server automatically handles both simple and complex nested schemas using the optimal write strategy.

## Features

- **Write to Table**: Write records to any Delta table path with automatic schema inference
- **Read from Table**: Read all records from any Delta table path
- **Complex Type Support**: Handles complex nested types (arrays, structs) automatically using Apache Arrow + parquet-wasm
- **Schema Validation**: Ensures all records have consistent schema before writing
- **Date/Timestamp Support**: Automatically converts ISO date strings to proper timestamps
- **Empty Array Handling**: Correctly preserves empty arrays in nested structures
- **Robust Error Messages**: Clear error messages with troubleshooting tips

## How It Works

The server uses a robust Apache Arrow + parquet-wasm pipeline for all writes:

1. **Schema Validation**: Ensures all records have consistent fields
2. **Date Conversion**: Automatically converts ISO date strings to timestamps
3. **Arrow Table Creation**: Converts JSON records to Arrow table with proper nested schema
4. **Parquet Writing**: Uses parquet-wasm to write Parquet files with complex nested type support
5. **Delta Log Update**: Maintains Delta Lake transaction log for ACID compliance

This approach properly handles:
- Simple types (strings, numbers, booleans, dates)
- Complex nested objects (structs)
- Arrays of any type (including arrays of objects)
- Empty arrays (preserved correctly)
- Deeply nested structures

## Setup

### Prerequisites

The server uses Apache Arrow and parquet-wasm for Parquet file operations. All dependencies are included in package.json:

```bash
npm install
```

**Note**: No external Spark/PySpark installation required! The server uses native JavaScript libraries.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Configure Azure authentication by setting up one of the following:
   - Azure CLI login: `az login`
   - Environment variables for service principal
   - Managed identity (when running in Azure)

## Available Tools

### create_delta_table
Creates a new Delta table with a specified schema. Supports simple and complex types including arrays, structs, and maps.

**Parameters:**
- `tablePath`: The path to the delta table (e.g., 'test-tables/my-table')
- `schema`: Array of field definitions defining the table schema
- `storageAccount`: Azure storage account name
- `container`: Azure storage container name
- `partitionBy`: Optional list of column names to partition by
- `description`: Optional description for the table
- `properties`: Optional table properties as key-value pairs

**Supported Field Types:**
- Simple types: `string`, `int`, `long`, `double`, `float`, `boolean`, `date`, `timestamp`, `binary`
- Decimal: `decimal` (with precision and scale)
- Complex types: `array`, `struct`, `map`

**Example - Simple Table:**
```json
{
  "tablePath": "test-tables/customers",
  "schema": [
    { "name": "customer_id", "type": "long", "nullable": false },
    { "name": "name", "type": "string", "nullable": false },
    { "name": "email", "type": "string", "nullable": true },
    { "name": "balance", "type": "double", "nullable": true }
  ],
  "description": "Customer information table"
}
```

**Example - Complex Table with Struct:**
```json
{
  "tablePath": "test-tables/employees",
  "schema": [
    { "name": "employee_id", "type": "long", "nullable": false },
    { "name": "name", "type": "string", "nullable": false },
    { 
      "name": "address", 
      "type": "struct", 
      "nullable": true,
      "fields": [
        { "name": "street", "type": "string", "nullable": true },
        { "name": "city", "type": "string", "nullable": true },
        { "name": "zip_code", "type": "string", "nullable": true }
      ]
    }
  ],
  "partitionBy": ["hire_date"]
}
```

### write_to_table
Writes records to a Delta table at the specified path. Schema is automatically inferred from the data.

**Parameters:**
- `tablePath`: The path to the delta table (e.g., 'test-tables/my-table')
- `records`: Array of records to write to the table

**Example:**
```json
{
  "tablePath": "test-tables/simple-table",
  "records": [
    { "id": 1, "name": "John Doe", "age": 30 },
    { "id": 2, "name": "Jane Smith", "age": 25 }
  ]
}
```

### read_from_table
Reads all records from a Delta table at the specified path.

**Parameters:**
- `tablePath`: The path to the delta table (e.g., 'test-tables/my-table')

**Example:**
```json
{
  "tablePath": "test-tables/simple-table"
}
```

## Data Types Supported

The server automatically infers schema from your data:
- **Strings**: Stored as UTF8
- **Integers**: Stored as INT32
- **Floating point numbers**: Stored as DOUBLE
- **Booleans**: Stored as BOOLEAN
- **Dates**: Stored as TIMESTAMP_MILLIS (ISO date strings are auto-converted)
- **Complex objects**: Serialized as JSON strings

## Usage

Run the server:
```bash
npm start
```

The server will connect via stdio and be available for MCP tool calls.

## Technical Details

- Uses Parquet format with Snappy compression for data storage
- Implements Delta Lake transaction log protocol
- Supports any table path within the configured container
- Automatic schema inference from data structure
- Handles temporary file management for Parquet operations

### read_table_data
Reads and returns all records from the Delta table.

### populate_test_data
Populates the Delta table with 5 predefined test records for demonstration purposes.

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. The server will run in stdio mode and can be used with MCP-compatible clients.

## Development

- **Watch mode**: `npm run watch`
- **Debug mode**: `npm run debug`
- **Clean build**: `npm run rebuild`

## Authentication

This server uses Azure Default Credential which supports multiple authentication methods:
- Azure CLI
- Managed Identity
- Environment Variables
- Visual Studio Code
- Azure PowerShell

Make sure you have appropriate permissions to read/write to the specified Azure Data Lake Storage account.

## Delta Table Format

The server creates Delta tables following the Delta Lake transaction log protocol:
- Metadata is stored in `_delta_log/` directory
- Data files are stored as JSON files (simplified implementation)
- Transaction logs track all changes to the table

## Limitations

This is a simplified implementation for demonstration purposes:
- Data is stored as JSON files instead of Parquet for simplicity
- No advanced Delta Lake features like time travel, schema evolution, etc.
- No optimization features like compaction or Z-ordering

For production use cases, consider using a full Delta Lake implementation with proper Parquet support.
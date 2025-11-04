# Delta Table MCP Server - Usage Guide

## Available Tools

### 1. `write_to_table`
Writes records to a Delta table at any specified path with automatic schema inference.

**Usage:**
```json
{
  "tablePath": "test-tables/my-table",
  "records": [
    { "id": 1, "name": "Alice Johnson", "age": 30, "active": true },
    { "id": 2, "name": "Bob Smith", "age": 25, "active": false }
  ]
}
```

**Features:**
- Automatic schema inference from data structure
- Supports any field names and data types
- Creates Parquet files with Snappy compression
- Updates Delta Lake transaction logs

**Supported Data Types:**
- Strings (UTF8)
- Integers (INT32)
- Floating point numbers (DOUBLE)
- Booleans (BOOLEAN)
- Date objects or ISO date strings (TIMESTAMP_MILLIS)
- Complex objects (serialized as JSON strings)

### 2. `read_from_table`
Reads all records from a Delta table at the specified path.

**Usage:**
```json
{
  "tablePath": "test-tables/my-table"
}
```

**Returns:**
- All records from the table in JSON format
- Record count summary
- Automatic conversion from Parquet format

## Common Usage Patterns

### Testing Simple Data
```json
{
  "tablePath": "tests/simple-test",
  "records": [
    { "user_id": 123, "event": "login", "timestamp": "2024-01-15T10:30:00Z" },
    { "user_id": 456, "event": "logout", "timestamp": "2024-01-15T11:45:00Z" }
  ]
}
```

### Testing Complex Data
```json
{
  "tablePath": "tests/complex-test", 
  "records": [
    { 
      "id": 1,
      "metadata": { "source": "api", "version": "1.0" },
      "tags": ["test", "demo"],
      "score": 95.5,
      "verified": true
    }
  ]
}
```

## Authentication

Ensure you have Azure authentication configured:
```bash
az login
```

## File Structure Created

For each table path, the server creates:
```
{tablePath}/
├── _delta_log/
│   ├── 00000000000000000000.json  # Initial transaction
│   ├── 00000000000000000001.json  # First data write
│   └── ...
└── part-{timestamp}-{uuid}.snappy.parquet  # Data files
```

This structure is compatible with standard Delta Lake readers and Spark.

**Usage:**
```
read_table_data
```

## Typical Workflow

1. **Create the table:**
   ```
   Use the create_delta_table tool
   ```

2. **Add initial test data:**
   ```
   Use the populate_test_data tool
   ```

3. **Read the data to verify:**
   ```
   Use the read_table_data tool
   ```

4. **Add more data as needed:**
   ```
   Use the insert_data tool with your custom records
   ```

5. **Read again to see all data:**
   ```
   Use the read_table_data tool
   ```

## Example Conversation

**User:** "Create a delta table and populate it with test data"

**Steps:**
1. Use `create_delta_table`
2. Use `populate_test_data`
3. Use `read_table_data` to verify

**User:** "Add two new records: id=6, name='John Doe' and id=7, name='Jane Smith'"

**Steps:**
1. Use `insert_data` with:
   ```json
   {
     "records": [
       { "id": 6, "name": "John Doe" },
       { "id": 7, "name": "Jane Smith" }
     ]
   }
   ```
2. Use `read_table_data` to verify the additions

## Azure Setup Requirements

For production use, ensure you have:

1. **Azure Authentication** configured via one of:
   - Azure CLI: `az login`
   - Service Principal environment variables
   - Managed Identity (for Azure-hosted applications)

2. **Permissions** to the storage account:
   - Storage Blob Data Contributor role
   - Storage File Data SMB Share Contributor role

3. **Network Access** to the Azure Data Lake Storage account

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Ensure Azure credentials are properly configured
2. **Permission Denied**: Check that your account has the necessary roles
3. **Network Error**: Verify connectivity to Azure Data Lake Storage
4. **Table Already Exists**: The `create_delta_table` tool will inform you if the table already exists

### Testing Without Azure

For local testing without Azure credentials, the service includes mock implementations that simulate the Delta table operations in memory.
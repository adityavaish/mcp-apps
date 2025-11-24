# Example Usage - Delta Table MCP Server

## Simple Example Prompts

Here are example prompts you can use to test the simplified MCP server:

### 1. Write Test Data to a Table

**Prompt:**
```
Write some test data to a delta table at path "test-tables/employee-data" with the following records:
- Employee ID 1001, name "John Smith", department "Engineering", salary 75000, active true
- Employee ID 1002, name "Sarah Johnson", department "Marketing", salary 65000, active true  
- Employee ID 1003, name "Mike Davis", department "Sales", salary 55000, active false
```

**Expected MCP Tool Call:**
```json
{
  "tool": "write_to_table",
  "arguments": {
    "tablePath": "test-tables/employee-data",
    "records": [
      { "emp_id": 1001, "name": "John Smith", "department": "Engineering", "salary": 75000, "active": true },
      { "emp_id": 1002, "name": "Sarah Johnson", "department": "Marketing", "salary": 65000, "active": true },
      { "emp_id": 1003, "name": "Mike Davis", "department": "Sales", "salary": 55000, "active": false }
    ]
  }
}
```

### 2. Read Data from a Table

**Prompt:**
```
Read all the data from the delta table at path "test-tables/employee-data"
```

**Expected MCP Tool Call:**
```json
{
  "tool": "read_from_table", 
  "arguments": {
    "tablePath": "test-tables/employee-data"
  }
}
```

### 5. Complex Data Structure Example

**Prompt:**
```
Write complex event data to table "events/user-activity" with these records:
- User 12345: event "page_view", page "/dashboard", metadata includes browser "Chrome", device "desktop", session duration 300 seconds
- User 67890: event "button_click", element "submit_form", metadata includes A/B test variant "B", conversion true
```

### 6. Time Series Data Example

**Prompt:**
```
Create IoT sensor data in table "iot/sensor-readings" with:
- Sensor S001 at location "Building A Floor 1", temperature 22.5°C, humidity 45%, timestamp "2024-01-15T09:00:00Z"
- Sensor S002 at location "Building A Floor 2", temperature 23.1°C, humidity 42%, timestamp "2024-01-15T09:01:00Z"  
- Sensor S003 at location "Building B Floor 1", temperature 21.8°C, humidity 48%, timestamp "2024-01-15T09:02:00Z"
```

## What Happens When You Use These Prompts

1. **Automatic Schema Inference**: The MCP server will automatically detect data types from your records
2. **Parquet File Creation**: Data gets stored in efficient Parquet format with Snappy compression
3. **Delta Lake Protocol**: Transaction logs are created following Delta Lake standards
4. **Azure Storage**: Files are stored in your configured Azure Data Lake Storage container

## Testing the Examples

You can test any of these prompts by:
1. Starting the MCP server: `npm start`
2. Using the prompts in an MCP-enabled client
3. Verifying data was written by using read prompts
4. Checking Azure Storage to see the created files

## File Structure Created

Each table will create this structure in Azure:
```
{tablePath}/
├── _delta_log/
│   ├── 00000000000000000000.json  # Transaction log
│   └── 00000000000000000001.json  # Data commit
└── part-{timestamp}-{uuid}.snappy.parquet  # Your data
```
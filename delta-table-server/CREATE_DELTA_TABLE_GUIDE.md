# Create Delta Table Tool Documentation

## Overview

The `create_delta_table` tool allows you to create new Delta tables with explicitly defined schemas. This is useful when you need to:
- Define a table structure before inserting data
- Ensure data consistency with a predefined schema
- Create tables with complex nested types (arrays, structs, maps)
- Set up partitioned tables for better query performance
- Add metadata and properties to tables

## Tool Name
`create_delta_table`

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tablePath` | string | The path to the delta table (e.g., 'data/tables/my-table.delta') |
| `schema` | array | Array of field definitions defining the table schema |

## Schema Field Definition

Each field in the schema array has the following structure:

```typescript
{
  name: string;           // Field name (required)
  type: string;           // Field type (required)
  nullable: boolean;      // Whether field can be null (default: true)

  // For array types:
  elementType?: string;   // Type of array elements

  // For struct types:
  fields?: array;         // Array of nested field definitions

  // For map types:
  keyType?: string;       // Type of map keys
  valueType?: string;     // Type of map values

  // For decimal types:
  precision?: number;     // Total digits
  scale?: number;         // Digits after decimal point
}
```

## Supported Data Types

### Simple Types

| Type | Description | PyArrow Type |
|------|-------------|--------------|
| `string` | Text data | pa.string() |
| `int` | 32-bit integer | pa.int32() |
| `long` | 64-bit integer | pa.int64() |
| `float` | 32-bit floating point | pa.float32() |
| `double` | 64-bit floating point | pa.float64() |
| `boolean` | True/False values | pa.bool_() |
| `date` | Date without time | pa.date32() |
| `timestamp` | Date and time | pa.timestamp('us') |
| `binary` | Binary data | pa.binary() |
| `decimal` | Fixed-precision decimal | pa.decimal128(precision, scale) |

### Complex Types

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `array` | List of elements | Requires `elementType` |
| `struct` | Nested object | Requires `fields` array |
| `map` | Key-value pairs | Requires `keyType` and `valueType` |

## Examples

### Example 1: Simple Customer Table

```json
{
  "tablePath": "test-tables/customers",
  "schema": [
    { "name": "customer_id", "type": "long", "nullable": false },
    { "name": "name", "type": "string", "nullable": false },
    { "name": "email", "type": "string", "nullable": true },
    { "name": "age", "type": "int", "nullable": true },
    { "name": "balance", "type": "double", "nullable": true },
    { "name": "is_active", "type": "boolean", "nullable": false },
    { "name": "created_date", "type": "timestamp", "nullable": false }
  ],
  "description": "Customer information table",
  "properties": {
    "owner": "data-team",
    "retention_days": "365"
  }
}
```

### Example 2: Orders with Arrays

```json
{
  "tablePath": "test-tables/orders",
  "schema": [
    { "name": "order_id", "type": "long", "nullable": false },
    { "name": "customer_id", "type": "long", "nullable": false },
    { "name": "product_ids", "type": "array", "elementType": "long", "nullable": true },
    { "name": "tags", "type": "array", "elementType": "string", "nullable": true },
    { "name": "total_amount", "type": "double", "nullable": false },
    { "name": "order_date", "type": "timestamp", "nullable": false }
  ],
  "partitionBy": ["order_date"],
  "description": "Orders with product arrays"
}
```

### Example 3: Employees with Nested Address

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
        { "name": "state", "type": "string", "nullable": true },
        { "name": "zip_code", "type": "string", "nullable": true }
      ]
    },
    { "name": "salary", "type": "double", "nullable": true },
    { "name": "hire_date", "type": "date", "nullable": false }
  ],
  "description": "Employee information with nested address"
}
```

### Example 4: Financial Transactions with Decimals

```json
{
  "tablePath": "test-tables/transactions",
  "schema": [
    { "name": "transaction_id", "type": "long", "nullable": false },
    { "name": "account_id", "type": "long", "nullable": false },
    { "name": "amount", "type": "decimal", "precision": 18, "scale": 2, "nullable": false },
    { "name": "fee", "type": "decimal", "precision": 18, "scale": 2, "nullable": true },
    { "name": "transaction_type", "type": "string", "nullable": false },
    { "name": "transaction_date", "type": "timestamp", "nullable": false }
  ],
  "partitionBy": ["transaction_date"],
  "description": "Financial transactions with precise decimal amounts"
}
```

### Example 5: Products with Map Attributes

```json
{
  "tablePath": "test-tables/products",
  "schema": [
    { "name": "product_id", "type": "long", "nullable": false },
    { "name": "name", "type": "string", "nullable": false },
    { "name": "price", "type": "double", "nullable": false },
    { 
      "name": "attributes", 
      "type": "map", 
      "keyType": "string", 
      "valueType": "string", 
      "nullable": true 
    },
    { "name": "created_date", "type": "timestamp", "nullable": false }
  ],
  "description": "Products with key-value attributes"
}
```

### Example 6: Invoice with Arrays of Structs

```json
{
  "tablePath": "test-tables/invoices",
  "schema": [
    { "name": "invoice_id", "type": "string", "nullable": false },
    { "name": "invoice_date", "type": "timestamp", "nullable": false },
    { "name": "total_amount", "type": "double", "nullable": false },
    { 
      "name": "line_items", 
      "type": "array",
      "elementType": "struct",
      "nullable": true,
      "fields": [
        { "name": "item_id", "type": "string", "nullable": false },
        { "name": "description", "type": "string", "nullable": true },
        { "name": "quantity", "type": "int", "nullable": false },
        { "name": "unit_price", "type": "double", "nullable": false },
        { "name": "total_price", "type": "double", "nullable": false }
      ]
    },
    { "name": "customer_name", "type": "string", "nullable": false }
  ],
  "description": "Invoices with nested line items"
}
```

## Partitioning

Partitioning improves query performance by organizing data based on column values. Common partition keys include:
- Date/timestamp columns (e.g., `order_date`, `transaction_date`)
- Category columns (e.g., `region`, `department`, `status`)
- ID columns for large-scale data (e.g., `customer_id` for multi-tenant systems)

**Example with partitioning:**
```json
{
  "tablePath": "test-tables/sales",
  "schema": [
    { "name": "sale_id", "type": "long", "nullable": false },
    { "name": "amount", "type": "double", "nullable": false },
    { "name": "region", "type": "string", "nullable": false },
    { "name": "sale_date", "type": "date", "nullable": false }
  ],
  "partitionBy": ["region", "sale_date"]
}
```

## Table Properties

You can add custom metadata to tables using the `properties` parameter:

```json
{
  "properties": {
    "owner": "data-engineering-team",
    "project": "customer-analytics",
    "retention_days": "730",
    "pii_data": "true",
    "data_classification": "confidential"
  }
}
```

## Error Handling

The tool will fail with an error if:
1. **Table already exists** - The tool will not overwrite existing tables
2. **Invalid schema** - Missing required fields or invalid types
3. **Authentication failure** - Azure CLI not authenticated or insufficient permissions
4. **Invalid path** - Storage account or container doesn't exist

## Prerequisites

1. **Python with deltalake library**: 
   ```bash
   pip install deltalake pyarrow
   ```

2. **Azure CLI authentication**:
   ```bash
   az login
   ```

3. **Storage permissions**: Write access to the specified storage account and container

## Best Practices

1. **Use explicit nullable settings**: Specify `nullable: false` for required fields
2. **Choose appropriate types**: Use `long` for IDs, `decimal` for precise monetary values
3. **Partition wisely**: Partition by columns frequently used in WHERE clauses
4. **Add descriptions**: Document tables with meaningful descriptions
5. **Use properties**: Add metadata for governance and discovery
6. **Test with small schemas first**: Verify the schema structure before creating complex tables

## Workflow

Typical workflow when using `create_delta_table`:

1. **Define schema** - Determine columns, types, and constraints
2. **Create table** - Use `create_delta_table` tool
3. **Write data** - Use `write_with_deltalake` or other write tools
4. **Query data** - Use `read_from_table` or external tools (Spark, Databricks, etc.)

## Integration with Other Tools

After creating a table with `create_delta_table`, you can:
- Write data using `write_with_deltalake` tool
- Read data using `read_from_table` tool
- Query using Spark, Databricks, or any Delta Lake compatible tool
- Perform analytics using Azure Synapse Analytics

## Troubleshooting

### Error: "Table already exists"
- The table path is already in use
- Solution: Choose a different path or delete the existing table

### Error: "Authentication failed"
- Azure CLI not authenticated
- Solution: Run `az login` and try again

### Error: "Invalid schema"
- Missing required fields in schema definition
- Solution: Ensure each field has `name` and `type` properties

### Error: "Python or deltalake not found"
- Required Python packages not installed
- Solution: Install with `pip install deltalake pyarrow`

## See Also

- [Delta Lake Protocol](https://github.com/delta-io/delta/blob/master/PROTOCOL.md)
- [PyArrow Types](https://arrow.apache.org/docs/python/api/datatypes.html)
- [Azure Data Lake Storage Gen2](https://docs.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction)
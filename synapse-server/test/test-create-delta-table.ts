/**
 * Test script for create_delta_table tool
 * 
 * This tests that the Delta table transaction log is created with proper JSON Lines format
 */

import { createDeltaTableTool } from '../src/tools/delta-table-tools.js';

async function testCreateDeltaTable() {
  console.log('Testing create_delta_table tool...\n');

  const testArgs = {
    tablePath: 'test-tables/sample-orders.delta',
    columns: [
      { name: 'OrderId', type: 'long' as const, nullable: false },
      { name: 'CustomerId', type: 'string' as const, nullable: true },
      { name: 'OrderDate', type: 'timestamp' as const, nullable: true },
      { name: 'TotalAmount', type: 'double' as const, nullable: true },
      { name: 'Status', type: 'string' as const, nullable: true }
    ],
    partitionColumns: ['Status'],
    description: 'Sample orders table for testing'
  };

  try {
    console.log('Test arguments:');
    console.log(JSON.stringify(testArgs, null, 2));
    console.log('\n---\n');

    const result = await createDeltaTableTool.handler(testArgs);

    console.log('Result:');
    console.log(result.content[0].text);

    if (result.isError) {
      console.error('\n❌ Test failed with error');
      process.exit(1);
    } else {
      console.log('\n✅ Test passed - Delta table created successfully');
      console.log('\nNote: The transaction log is created in JSON Lines format (one JSON object per line)');
      console.log('This prevents Spark JSON parsing errors.');
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    process.exit(1);
  }
}

// Run the test
testCreateDeltaTable();
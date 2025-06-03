import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeQueryTool } from '../../src/tools/execute-query';
import { KustoService } from '../../src/services/kustoService';

// Mock KustoService
vi.mock('../../src/services/kustoService', () => ({
  KustoService: {
    executeQuery: vi.fn()
  }
}));

describe('executeQueryTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully execute a valid query', async () => {
    const mockResult = [{ id: 1, name: 'test' }];
    vi.mocked(KustoService.executeQuery).mockResolvedValueOnce(mockResult);

    const result = await executeQueryTool.handler({
      clusterUrl: 'https://test.kusto.windows.net',
      database: 'testdb',
      query: 'TestTable | count'
    });

    expect(KustoService.executeQuery).toHaveBeenCalledWith(
      'https://test.kusto.windows.net',
      'testdb',
      'TestTable | count | take 100'
    );
    expect(result.content[0].text).toBe(`Query results: ${JSON.stringify(mockResult, null, 2)}`);
  });

  it.each([
    ['alter table command', '.alter table TestTable (Column1: string)'],
    ['create table command', '.create table NewTable (id: int)'],
    ['drop table command', '.drop table OldTable'],
    ['set command', '.set quotas'],
    ['create function command', '.create function TestFunc() { print "test" }'],
    ['alter function command', '.alter function TestFunc() { print "modified" }'],
    ['drop function command', '.drop function TestFunc'],
    ['show function command', '.show function TestFunc'],
    ['create policy command', '.create policy caching'],
    ['alter policy command', '.alter policy retention'],
    ['delete policy command', '.delete policy caching'],
    ['show policy command', '.show policy retention'],
    ['purge command', '.purge table TestTable records'],
    ['ingest command', '.ingest into table TestTable'],
    ['show ingestion command', '.show ingestion failures'],
    ['create ingestion command', '.create ingestion mapping'],
    ['show management command', '.show management groups'],
    ['create cluster command', '.create cluster test'],
    ['alter cluster command', '.alter cluster policy'],
    ['render command', 'StormEvents | render timechart'],
  ])('should reject %s', async (testCase, query) => {
    const result = await executeQueryTool.handler({
      clusterUrl: 'https://test.kusto.windows.net',
      database: 'testdb',
      query
    });

    expect(result.content[0].text).toContain('Error: The query contains forbidden administrative commands');
    expect(KustoService.executeQuery).not.toHaveBeenCalled();
  });

  it.each([
    ['database command', '.show database'],
    ['cluster command', 'cluster("other")'],
    ['let statement', 'let var = 10'],
    ['query with ingestion in column name', 'KeyGroupCurrentState | where SynapseJobIngestionTime > ago(7d) | take 1'],
    ['query with function in column name', 'TestTable | where FunctionName == "test"'],
    ['query with policy in column name', 'TestTable | where PolicyType == "retention"']
  ])('should accept %s', async (testCase, query) => {
    vi.mocked(KustoService.executeQuery).mockResolvedValueOnce([]);

    await executeQueryTool.handler({
      clusterUrl: 'https://test.kusto.windows.net',
      database: 'testdb',
      query
    });
    
    expect(KustoService.executeQuery).toHaveBeenCalled();
  });

  it('should handle maxRows parameter', async () => {
    vi.mocked(KustoService.executeQuery).mockResolvedValueOnce([]);

    await executeQueryTool.handler({
      clusterUrl: 'https://test.kusto.windows.net',
      database: 'testdb',
      query: 'TestTable',
      maxRows: 50
    });

    expect(KustoService.executeQuery).toHaveBeenCalledWith(
      'https://test.kusto.windows.net',
      'testdb',
      'TestTable | take 50'
    );
  });

  it('should handle query execution errors', async () => {
    const errorMessage = 'Failed to execute query';
    vi.mocked(KustoService.executeQuery).mockRejectedValueOnce(new Error(errorMessage));

    const result = await executeQueryTool.handler({
      clusterUrl: 'https://test.kusto.windows.net',
      database: 'testdb',
      query: 'TestTable'
    });

    expect(result.content[0].text).toBe(`Error executing query: ${errorMessage}`);
  });
});

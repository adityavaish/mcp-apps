import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AzureCliCredential,
  AzureDeveloperCliCredential,
  ChainedTokenCredential,
  DeviceCodeCredential,
  VisualStudioCodeCredential,
} from '@azure/identity';
import { Client as KustoClient, KustoConnectionStringBuilder } from 'azure-kusto-data';

const mocks = vi.hoisted(() => ({
  credential: {
    getToken: vi.fn(() => {
      throw new Error('Token acquisition must be delegated to the Kusto SDK');
    }),
  },
  connectionString: {},
  execute: vi.fn(),
}));

vi.mock('@azure/identity', () => ({
  AzureCliCredential: vi.fn(),
  AzureDeveloperCliCredential: vi.fn(),
  ChainedTokenCredential: vi.fn(function () { return mocks.credential; }),
  DeviceCodeCredential: vi.fn(),
  VisualStudioCodeCredential: vi.fn(),
}));

vi.mock('azure-kusto-data', () => ({
  KustoConnectionStringBuilder: {
    withTokenCredential: vi.fn(() => mocks.connectionString),
  },
  Client: vi.fn(function () { return { execute: mocks.execute }; }),
}));

describe('KustoService authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.execute.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['public', 'https://test.westus.kusto.windows.net'],
    ['China', 'https://test.chinaeast2.kusto.chinacloudapi.cn'],
  ])('delegates %s cloud authentication to the SDK without a token preflight', async (_, clusterUrl) => {
    const { KustoService } = await import('../../src/services/kustoService');
    const result = { data: [{ ProbeSuccess: 1 }] };
    mocks.execute.mockResolvedValueOnce({
      primaryResults: [{ toJSON: () => result }],
    });

    await expect(KustoService.executeQuery(clusterUrl, 'testdb', 'print ProbeSuccess=1'))
      .resolves.toEqual(result);

    expect(mocks.credential.getToken).not.toHaveBeenCalled();
    expect(ChainedTokenCredential).toHaveBeenCalledExactlyOnceWith(
      vi.mocked(AzureCliCredential).mock.instances[0],
      vi.mocked(AzureDeveloperCliCredential).mock.instances[0],
      vi.mocked(VisualStudioCodeCredential).mock.instances[0],
      vi.mocked(DeviceCodeCredential).mock.instances[0],
    );
    expect(KustoConnectionStringBuilder.withTokenCredential)
      .toHaveBeenCalledExactlyOnceWith(clusterUrl, mocks.credential);
    expect(KustoClient).toHaveBeenCalledExactlyOnceWith(mocks.connectionString);
    expect(mocks.execute).toHaveBeenCalledExactlyOnceWith('testdb', 'print ProbeSuccess=1');
  });

  it('reuses the credential chain while delegating each cluster separately', async () => {
    const { KustoService } = await import('../../src/services/kustoService');
    mocks.execute.mockResolvedValue({ primaryResults: [{ toJSON: () => ({ data: [] }) }] });
    const clusters = [
      'https://test.westus.kusto.windows.net',
      'https://test.chinaeast2.kusto.chinacloudapi.cn',
    ];

    for (const clusterUrl of clusters) {
      await KustoService.executeQuery(clusterUrl, 'testdb', 'print ProbeSuccess=1');
    }

    expect(ChainedTokenCredential).toHaveBeenCalledTimes(1);
    expect(KustoConnectionStringBuilder.withTokenCredential).toHaveBeenCalledTimes(2);
    clusters.forEach((clusterUrl, index) => {
      expect(KustoConnectionStringBuilder.withTokenCredential)
        .toHaveBeenNthCalledWith(index + 1, clusterUrl, mocks.credential);
    });
    expect(mocks.credential.getToken).not.toHaveBeenCalled();
  });

  it('surfaces authentication failures from SDK execution', async () => {
    const { KustoService } = await import('../../src/services/kustoService');
    mocks.execute.mockRejectedValueOnce(new Error('SDK authentication failed'));

    await expect(KustoService.executeQuery(
      'https://test.chinaeast2.kusto.chinacloudapi.cn', 'testdb', 'print ProbeSuccess=1',
    )).rejects.toThrow('Error executing query: SDK authentication failed');
    expect(mocks.credential.getToken).not.toHaveBeenCalled();
  });
});

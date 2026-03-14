// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginModel } from '@/database/models/plugin';
import { getKlavisClient, isKlavisClientAvailable } from '@/libs/klavis';

import { KlavisService } from './index';

// Mock debug
vi.mock('debug', () => ({
  default: vi.fn().mockReturnValue(vi.fn()),
}));

// Mock isKlavisClientAvailable and getKlavisClient
vi.mock('@/libs/klavis', () => ({
  getKlavisClient: vi.fn(),
  isKlavisClientAvailable: vi.fn(),
}));

// Mock PluginModel
vi.mock('@/database/models/plugin', () => ({
  PluginModel: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    query: vi.fn(),
  })),
}));

const mockIsKlavisClientAvailable = vi.mocked(isKlavisClientAvailable);
const mockGetKlavisClient = vi.mocked(getKlavisClient);
const MockPluginModel = vi.mocked(PluginModel);

describe('KlavisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsKlavisClientAvailable.mockReturnValue(true);
  });

  describe('constructor', () => {
    it('should initialize without db and userId', () => {
      const service = new KlavisService();
      expect(service).toBeDefined();
    });

    it('should initialize with db and userId', () => {
      const mockDb = {} as any;
      const service = new KlavisService({ db: mockDb, userId: 'user-1' });
      expect(service).toBeDefined();
      expect(MockPluginModel).toHaveBeenCalledWith(mockDb, 'user-1');
    });

    it('should not create PluginModel if only db is provided', () => {
      const mockDb = {} as any;
      MockPluginModel.mockClear();
      new KlavisService({ db: mockDb });
      expect(MockPluginModel).not.toHaveBeenCalled();
    });

    it('should not create PluginModel if only userId is provided', () => {
      MockPluginModel.mockClear();
      new KlavisService({ userId: 'user-1' });
      expect(MockPluginModel).not.toHaveBeenCalled();
    });
  });

  describe('executeKlavisTool', () => {
    it('should return error when Klavis is not configured', async () => {
      mockIsKlavisClientAvailable.mockReturnValue(false);
      const service = new KlavisService();

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_NOT_CONFIGURED');
      expect(result.content).toContain('not configured');
    });

    it('should return error when pluginModel is not initialized', async () => {
      mockIsKlavisClientAvailable.mockReturnValue(true);
      const service = new KlavisService(); // no db/userId

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_NOT_INITIALIZED');
    });

    it('should return error when plugin is not found in database', async () => {
      const mockPluginInstance = { findById: vi.fn().mockResolvedValue(null), query: vi.fn() };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'unknown-server',
        toolName: 'someAction',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_SERVER_NOT_FOUND');
      expect(result.content).toContain('unknown-server');
    });

    it('should return error when plugin has no klavis customParams', async () => {
      const mockPlugin = { identifier: 'google-calendar', customParams: {} };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_CONFIG_NOT_FOUND');
    });

    it('should return error when plugin klavis config has no serverUrl', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverName: 'Google Calendar' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_CONFIG_NOT_FOUND');
    });

    it('should return error when Klavis API returns failure response', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        error: 'Tool execution failed',
        success: false,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: { calendarId: 'primary' },
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_EXECUTION_ERROR');
      expect(result.content).toBe('Tool execution failed');
    });

    it('should return error when Klavis API response has no result', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({ success: true, result: null });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_EXECUTION_ERROR');
    });

    it('should successfully execute tool and return text content', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        result: { content: 'Event list retrieved', isError: false },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: { calendarId: 'primary' },
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('Event list retrieved');
      expect(mockCallTools).toHaveBeenCalledWith({
        serverUrl: 'https://klavis.example.com/mcp',
        toolArgs: { calendarId: 'primary' },
        toolName: 'listEvents',
      });
    });

    it('should handle array content with text items', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        result: {
          content: [
            { type: 'text', text: 'First line' },
            { type: 'text', text: 'Second line' },
          ],
          isError: false,
        },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('First line\nSecond line');
    });

    it('should handle array content with plain string items', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        result: { content: ['item1', 'item2'], isError: false },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'someAction',
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('item1\nitem2');
    });

    it('should handle array content with non-text object items (JSON stringify fallback)', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        result: { content: [{ type: 'image', data: 'base64...' }], isError: false },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'someAction',
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe(JSON.stringify({ type: 'image', data: 'base64...' }));
    });

    it('should handle non-array, non-string content (JSON stringify)', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const contentObj = { data: 'some data' };
      const mockCallTools = vi.fn().mockResolvedValue({
        result: { content: contentObj, isError: false },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'someAction',
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe(JSON.stringify(contentObj));
    });

    it('should return success=false when isError is true', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockResolvedValue({
        result: { content: 'Tool failed internally', isError: true },
        success: true,
      });
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.content).toBe('Tool failed internally');
    });

    it('should handle thrown exceptions and return error result', async () => {
      const mockPlugin = {
        identifier: 'google-calendar',
        customParams: { klavis: { serverUrl: 'https://klavis.example.com/mcp' } },
      };
      const mockPluginInstance = {
        findById: vi.fn().mockResolvedValue(mockPlugin),
        query: vi.fn(),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const mockCallTools = vi.fn().mockRejectedValue(new Error('Network error'));
      mockGetKlavisClient.mockReturnValue({
        mcpServer: { callTools: mockCallTools },
      } as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.executeKlavisTool({
        args: {},
        identifier: 'google-calendar',
        toolName: 'listEvents',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KLAVIS_ERROR');
      expect(result.content).toBe('Network error');
    });
  });

  describe('getKlavisManifests', () => {
    it('should return empty array when pluginModel is not available', async () => {
      const service = new KlavisService(); // no db/userId

      const result = await service.getKlavisManifests();

      expect(result).toEqual([]);
    });

    it('should return empty array when no authenticated Klavis plugins exist', async () => {
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue([
          { identifier: 'google-calendar', customParams: { klavis: { isAuthenticated: false } } },
          { identifier: 'other-plugin', customParams: {} },
        ]),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toEqual([]);
    });

    it('should return manifests for authenticated Klavis plugins', async () => {
      const mockPlugins = [
        {
          identifier: 'google-calendar',
          customParams: {
            klavis: {
              isAuthenticated: true,
              serverName: 'Google Calendar',
              serverUrl: 'https://...',
            },
          },
          manifest: {
            api: [{ name: 'listEvents', description: 'List events' }],
            meta: {
              avatar: '📅',
              description: 'Google Calendar',
              tags: ['calendar'],
              title: 'Google Calendar',
            },
          },
        },
      ];
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue(mockPlugins),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('google-calendar');
      expect(result[0].author).toBe('Klavis');
      expect(result[0].type).toBe('builtin');
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].api).toEqual([{ name: 'listEvents', description: 'List events' }]);
    });

    it('should use default meta when manifest has no meta', async () => {
      const mockPlugins = [
        {
          identifier: 'google-calendar',
          customParams: {
            klavis: { isAuthenticated: true, serverName: 'Google Calendar' },
          },
          manifest: {
            api: [],
            meta: undefined,
          },
        },
      ];
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue(mockPlugins),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toHaveLength(1);
      expect(result[0].meta.title).toBe('Google Calendar');
      expect(result[0].meta.tags).toEqual(['klavis', 'mcp']);
    });

    it('should use identifier as title when serverName is not set', async () => {
      const mockPlugins = [
        {
          identifier: 'google-calendar',
          customParams: {
            klavis: { isAuthenticated: true },
          },
          manifest: { api: [], meta: undefined },
        },
      ];
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue(mockPlugins),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toHaveLength(1);
      expect(result[0].meta.title).toBe('google-calendar');
    });

    it('should filter out plugins without manifest', async () => {
      const mockPlugins = [
        {
          identifier: 'google-calendar',
          customParams: { klavis: { isAuthenticated: true, serverName: 'Google Calendar' } },
          manifest: null,
        },
        {
          identifier: 'slack',
          customParams: { klavis: { isAuthenticated: true, serverName: 'Slack' } },
          manifest: {
            api: [],
            meta: { avatar: '💬', description: 'Slack', tags: [], title: 'Slack' },
          },
        },
      ];
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue(mockPlugins),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('slack');
    });

    it('should return empty array on query error', async () => {
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toEqual([]);
    });

    it('should handle multiple authenticated plugins', async () => {
      const mockPlugins = [
        {
          identifier: 'google-calendar',
          customParams: { klavis: { isAuthenticated: true, serverName: 'Google Calendar' } },
          manifest: {
            api: [],
            meta: { title: 'Google Calendar', description: '', tags: [], avatar: '' },
          },
        },
        {
          identifier: 'slack',
          customParams: { klavis: { isAuthenticated: true, serverName: 'Slack' } },
          manifest: { api: [], meta: { title: 'Slack', description: '', tags: [], avatar: '' } },
        },
        {
          identifier: 'jira',
          customParams: { klavis: { isAuthenticated: false, serverName: 'Jira' } },
          manifest: { api: [], meta: { title: 'Jira', description: '', tags: [], avatar: '' } },
        },
      ];
      const mockPluginInstance = {
        findById: vi.fn(),
        query: vi.fn().mockResolvedValue(mockPlugins),
      };
      MockPluginModel.mockImplementation(() => mockPluginInstance as any);

      const service = new KlavisService({ db: {} as any, userId: 'user-1' });

      const result = await service.getKlavisManifests();

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.identifier)).toEqual(['google-calendar', 'slack']);
    });
  });
});

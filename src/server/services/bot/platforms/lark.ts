import { createLarkAdapter, type LarkAdapter } from '@lobechat/adapter-lark';
import { createIoRedisState } from '@chat-adapter/state-ioredis';
import { Chat, ConsoleLogger } from 'chat';
import debug from 'debug';

import { appEnv } from '@/envs/app';
import { getAgentRuntimeRedisClient } from '@/server/modules/AgentRuntime/redis';

import { AgentBridgeService } from '../AgentBridgeService';
import type { PlatformBot } from '../types';

const log = debug('lobe-server:bot:gateway:lark');

export interface LarkBotConfig {
  [key: string]: string | undefined;
  appId: string;
  appSecret: string;
  /** AES decrypt key for encrypted events (optional) */
  encryptKey?: string;
  /** 'lark' or 'feishu' — determines API base URL */
  platform?: string;
  /** Verification token for webhook event validation (optional) */
  verificationToken?: string;
}

export interface LarkGatewayListenerOptions {
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Lark/Feishu platform bot with WebSocket long connection support.
 *
 * Uses the official Lark SDK's WSClient to establish a WebSocket connection
 * to receive events, eliminating the need for a public webhook URL.
 */
export class Lark implements PlatformBot {
  readonly platform: string;
  readonly applicationId: string;

  private config: LarkBotConfig;
  private adapter?: LarkAdapter;
  private bot?: Chat<any>;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(config: LarkBotConfig) {
    this.config = config;
    this.applicationId = config.appId;
    this.platform = config.platform || 'lark';
  }

  async start(options?: LarkGatewayListenerOptions): Promise<void> {
    log('Starting LarkBot appId=%s platform=%s', this.applicationId, this.platform);

    this.stopped = false;

    const adapter = createLarkAdapter({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      encryptKey: this.config.encryptKey,
      platform: this.config.platform as 'lark' | 'feishu',
      verificationToken: this.config.verificationToken,
    });

    const chatConfig: any = {
      adapters: { [this.platform]: adapter },
      userName: `lobehub-gateway-${this.applicationId}`,
    };

    const redisClient = getAgentRuntimeRedisClient();
    if (redisClient) {
      chatConfig.state = createIoRedisState({ client: redisClient, logger: new ConsoleLogger() });
    }

    const bot = new Chat(chatConfig);
    await bot.initialize();

    // Start WebSocket long connection
    await adapter.startWSClient();

    this.adapter = adapter;
    this.bot = bot;

    // Schedule refresh timer in long-running mode (no custom options)
    const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
    if (!options) {
      this.refreshTimer = setTimeout(() => {
        if (this.stopped) return;

        log(
          'LarkBot appId=%s duration elapsed (%dh), refreshing...',
          this.applicationId,
          durationMs / 3_600_000,
        );
        this.stopInternal();
        this.start().catch((err) => {
          log('Failed to refresh LarkBot appId=%s: %O', this.applicationId, err);
        });
      }, durationMs);
    }

    log('LarkBot appId=%s started (WebSocket long connection)', this.applicationId);
  }

  async stop(): Promise<void> {
    log('Stopping LarkBot appId=%s', this.applicationId);
    this.stopped = true;
    this.stopInternal();
  }

  private stopInternal(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.adapter) {
      this.adapter.stopWSClient();
      this.adapter = undefined;
    }
    this.bot = undefined;
  }
}

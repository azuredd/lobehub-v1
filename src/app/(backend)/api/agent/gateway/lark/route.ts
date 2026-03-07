import debug from 'debug';
import type { NextRequest } from 'next/server';
import { after } from 'next/server';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentBotProviderModel } from '@/database/models/agentBotProvider';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';
import { Lark, type LarkBotConfig } from '@/server/services/bot/platforms/lark';
import { BotConnectQueue } from '@/server/services/gateway/botConnectQueue';

const log = debug('lobe-server:bot:gateway:cron:lark');

const GATEWAY_DURATION_MS = 600_000; // 10 minutes
const POLL_INTERVAL_MS = 30_000; // 30 seconds

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LARK_PLATFORMS = ['lark', 'feishu'] as const;

async function processConnectQueue(remainingMs: number): Promise<number> {
  const queue = new BotConnectQueue();
  const items = await queue.popAll();
  const larkItems = items.filter((item) => item.platform === 'lark' || item.platform === 'feishu');

  if (larkItems.length === 0) return 0;

  log('Processing %d queued lark/feishu connect requests', larkItems.length);

  const serverDB = await getServerDB();
  const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();
  let processed = 0;

  for (const item of larkItems) {
    try {
      const model = new AgentBotProviderModel(serverDB, item.userId, gateKeeper);
      const provider = await model.findEnabledByApplicationId(item.platform, item.applicationId);

      if (!provider) {
        log('No enabled provider found for queued appId=%s', item.applicationId);
        await queue.remove(item.platform, item.applicationId);
        continue;
      }

      const bot = new Lark({
        ...provider.credentials,
        applicationId: provider.applicationId,
        platform: item.platform,
      } as LarkBotConfig);

      await bot.start({ durationMs: remainingMs });

      processed++;
      log('Started queued bot appId=%s platform=%s', item.applicationId, item.platform);
    } catch (err) {
      log('Failed to start queued bot appId=%s: %O', item.applicationId, err);
    }

    await queue.remove(item.platform, item.applicationId);
  }

  return processed;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const serverDB = await getServerDB();
  const gateKeeper = await KeyVaultsGateKeeper.initWithEnvKey();

  let started = 0;
  let total = 0;

  for (const platform of LARK_PLATFORMS) {
    const providers = await AgentBotProviderModel.findEnabledByPlatform(
      serverDB,
      platform,
      gateKeeper,
    );

    log('Found %d enabled %s providers', providers.length, platform);
    total += providers.length;

    for (const provider of providers) {
      const { applicationId, credentials } = provider;

      try {
        const bot = new Lark({
          ...credentials,
          applicationId,
          platform,
        } as LarkBotConfig);

        await bot.start({ durationMs: GATEWAY_DURATION_MS });

        started++;
        log('Started gateway listener for %s appId=%s', platform, applicationId);
      } catch (err) {
        log('Failed to start gateway listener for %s appId=%s: %O', platform, applicationId, err);
      }
    }
  }

  // Process any queued connect requests immediately
  const queued = await processConnectQueue(GATEWAY_DURATION_MS);

  // Poll for new connect requests in background
  after(async () => {
    const pollEnd = Date.now() + GATEWAY_DURATION_MS;

    while (Date.now() < pollEnd) {
      await sleep(POLL_INTERVAL_MS);
      if (Date.now() >= pollEnd) break;

      const remaining = pollEnd - Date.now();
      await processConnectQueue(remaining);
    }
  });

  return Response.json({ queued, started, total });
}

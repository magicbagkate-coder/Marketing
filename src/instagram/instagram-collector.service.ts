import { Injectable, Logger } from '@nestjs/common';

import type { CollectResult, NewsItem } from '@/sources/source.types';

import { envConfig } from '@/config/env.config';
import { fetchAccountPosts } from '@/instagram/instagram-posts';
import { instagramAccounts } from '@/sources/sources.config';

@Injectable()
export class InstagramCollectorService {
  private readonly logger = new Logger(InstagramCollectorService.name);

  /** Reads the latest posts of every listed account; without a configured token Instagram is skipped. */
  async collectPosts(): Promise<CollectResult> {
    if (!envConfig.instagramToken || !envConfig.instagramBusinessId) {
      this.logger.warn('Instagram token or business id is not set, skipping Instagram');
      return { items: [], failedSources: [] };
    }
    const results = await Promise.allSettled(instagramAccounts.map((username) => this.readAccount(username)));
    const items: NewsItem[] = [];
    const failedSources: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
        return;
      }
      failedSources.push(`Instagram @${instagramAccounts[index]}`);
      this.logger.warn(`Instagram @${instagramAccounts[index]} failed: ${String(result.reason)}`);
    });
    return { items, failedSources };
  }

  private readAccount(username: string): Promise<NewsItem[]> {
    return fetchAccountPosts({ businessId: envConfig.instagramBusinessId, token: envConfig.instagramToken, username });
  }
}

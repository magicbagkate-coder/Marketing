import { Injectable, Logger } from '@nestjs/common';

import type { CollectResult, NewsItem, NewsSource } from '@/sources/source.types';

import { DIGEST_WINDOW_HOURS, MAX_ITEMS_PER_SOURCE } from '@/collector/collector.constants';
import { fetchFeed } from '@/collector/feed-fetcher';
import { parseFeed } from '@/collector/feed-parser';
import { selectRecentItems } from '@/collector/recent-items';
import { InstagramCollectorService } from '@/instagram/instagram-collector.service';
import { newsSources } from '@/sources/sources.config';

@Injectable()
export class NewsCollectorService {
  private readonly logger = new Logger(NewsCollectorService.name);

  constructor(private readonly instagram: InstagramCollectorService) {}

  /** Reads every source and returns news from the last 24 hours; a failing source never stops the others. */
  async collectLastDay(): Promise<CollectResult> {
    const [feeds, posts] = await Promise.all([this.collectFeeds(), this.instagram.collectPosts()]);
    const recent = selectRecentItems([...feeds.items, ...posts.items], {
      now: new Date(),
      hours: DIGEST_WINDOW_HOURS,
      perSource: MAX_ITEMS_PER_SOURCE,
    });
    return { items: recent, failedSources: [...feeds.failedSources, ...posts.failedSources] };
  }

  private async collectFeeds(): Promise<CollectResult> {
    const results = await Promise.allSettled(newsSources.map((source) => this.readSource(source)));
    const items: NewsItem[] = [];
    const failedSources: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
        return;
      }
      failedSources.push(newsSources[index].name);
      this.logger.warn(`Source ${newsSources[index].name} failed: ${String(result.reason)}`);
    });
    return { items, failedSources };
  }

  private async readSource(source: NewsSource): Promise<NewsItem[]> {
    const xml = await fetchFeed(source.feedUrl);
    return parseFeed(xml, source.name);
  }
}

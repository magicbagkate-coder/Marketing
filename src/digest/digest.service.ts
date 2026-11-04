import { Injectable, Logger } from '@nestjs/common';

import type { NewsItem } from '@/sources/source.types';

import { NewsCollectorService } from '@/collector/news-collector.service';
import { ClaudeDigestService } from '@/digest/claude-digest.service';
import { describeClaudeFailure } from '@/digest/claude-failure';
import { NO_NEWS_MESSAGE } from '@/digest/digest.texts';
import { buildFailedSourcesLine, buildPlainDigest } from '@/digest/digest-format';
import { DigestPublisher } from '@/digest/digest-publisher';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly collector: NewsCollectorService,
    private readonly claude: ClaudeDigestService,
    private readonly publisher: DigestPublisher,
  ) {}

  /** Collects the last day of news, writes the digest and posts it to Telegram. */
  async runDigest(): Promise<void> {
    await this.publisher.publish(await this.buildMessage());
  }

  /** Builds today's digest and keeps it for the assistant only: nothing is posted to the group. */
  async refreshTrends(): Promise<void> {
    await this.publisher.remember(await this.buildMessage());
  }

  private async buildMessage(): Promise<string> {
    const { items, failedSources } = await this.collector.collectLastDay();
    this.logger.log(`Collected ${items.length} items, ${failedSources.length} sources failed`);
    const body = items.length === 0 ? NO_NEWS_MESSAGE : await this.writeBody(items);
    return [body, buildFailedSourcesLine(failedSources)].filter(Boolean).join('\n\n');
  }

  private async writeBody(items: NewsItem[]): Promise<string> {
    try {
      return await this.claude.writeDigest(items);
    } catch (error) {
      this.logger.error(`Claude digest failed, sending plain list instead: ${String(error)}`);
      return buildPlainDigest(items, describeClaudeFailure(error));
    }
  }
}

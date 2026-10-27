import { Injectable, Logger } from '@nestjs/common';

import type { NewsItem } from '@/sources/source.types';

import { NewsCollectorService } from '@/collector/news-collector.service';
import { ClaudeDigestService } from '@/digest/claude-digest.service';
import { describeClaudeFailure } from '@/digest/claude-failure';
import { NO_NEWS_MESSAGE } from '@/digest/digest.texts';
import { buildFailedSourcesLine, buildPlainDigest } from '@/digest/digest-format';
import { TelegramService } from '@/telegram/telegram.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly collector: NewsCollectorService,
    private readonly claude: ClaudeDigestService,
    private readonly telegram: TelegramService,
  ) {}

  /** Collects the last day of news, writes the digest and posts it to Telegram. */
  async runDigest(): Promise<void> {
    const { items, failedSources } = await this.collector.collectLastDay();
    this.logger.log(`Collected ${items.length} items, ${failedSources.length} sources failed`);
    const body = items.length === 0 ? NO_NEWS_MESSAGE : await this.writeBody(items);
    const failedLine = buildFailedSourcesLine(failedSources);
    await this.telegram.sendDigest([body, failedLine].filter(Boolean).join('\n\n'));
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

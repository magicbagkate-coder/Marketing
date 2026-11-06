import { Injectable, Logger } from '@nestjs/common';

import type { WinnerCard } from '@/winners/winner-cards';
import type { WinnerSource } from '@/winners/winner-sources';

import { SYSTEM_PROMPT } from '@/assistant/assistant.texts';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { VideoReviewService } from '@/assistant/video-review.service';
import { runPool } from '@/common/run-pool';
import { envConfig } from '@/config/env.config';
import { OwnReelService } from '@/instagram/own-reel.service';
import { buildTopReels, cardsForSummary } from '@/winners/winner-cards';
import { PATTERNS_FILE_HEADER, PATTERNS_INSTRUCTION } from '@/winners/winners.texts';
import { loadCardBody, patternsExist, readSources, readVideoFile, saveCard, saveFailures, writeLibrary } from '@/winners/winners-store';

export type BuildOptions = {
  /** Rewrite the pattern summary even if no new reel was analysed. */
  forcePatterns: boolean;
};

export type BuildReport = {
  total: number;
  analysed: number;
  reused: number;
  failed: string[];
  inLibrary: number;
  dropped: number;
};

type LoadedVideo = { video: Buffer; published?: string };

const PARALLEL_REELS = 3;
const ATTEMPTS = 2;
const RETRY_PAUSE_MS = 5000;
const SUMMARY_MAX_TOKENS = 8000;

const describeNumbers = (source: WinnerSource): string => {
  const views = source.views === undefined ? '' : `Просмотры: ${source.views}. `;
  return `${views}${source.note}`.trim();
};

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Turns the owner's list of successful reels into the library the script writer learns from: cards plus a summary of the patterns. */
@Injectable()
export class WinnersBuilder {
  private readonly logger = new Logger(WinnersBuilder.name);

  constructor(
    private readonly reviews: VideoReviewService,
    private readonly reels: OwnReelService,
    private readonly claude: ClaudeChatService,
  ) {}

  async build(options: BuildOptions): Promise<BuildReport> {
    const sources = await readSources();
    const failed: string[] = [];
    const counts = { analysed: 0, reused: 0 };
    await runPool(sources, PARALLEL_REELS, async (source) => {
      const isNew = await this.ensureCard(source, failed);
      if (isNew === undefined) return;
      counts[isNew ? 'analysed' : 'reused'] += 1;
    });
    await saveFailures(failed);
    const library = await this.publish(sources, counts.analysed > 0 || options.forcePatterns);
    return { total: sources.length, ...counts, failed, ...library };
  }

  /** True if the card was just made, false if it was already there, undefined if the reel could not be analysed. */
  private async ensureCard(source: WinnerSource, failed: string[]): Promise<boolean | undefined> {
    if (await loadCardBody(source.id)) return false;
    try {
      const body = await this.withRetry(() => this.analyse(source));
      await saveCard({ id: source.id, views: source.views, note: source.note, body });
      this.logger.log(`Card ${source.id} is ready`);
      return true;
    } catch (error) {
      failed.push(`${source.id}: ${String(error)}`);
      this.logger.warn(`Reel ${source.id} skipped: ${String(error)}`);
      return undefined;
    }
  }

  private async withRetry<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt < ATTEMPTS; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        this.logger.debug(`Attempt ${attempt} failed: ${String(error)}`);
        await pause(RETRY_PAUSE_MS);
      }
    }
    return task();
  }

  private async analyse(source: WinnerSource): Promise<string> {
    const { video, published } = await this.loadVideo(source);
    return this.reviews.card({ media: video, kind: 'video', caption: describeNumbers(source), published });
  }

  private async loadVideo(source: WinnerSource): Promise<LoadedVideo> {
    if (source.fileName) return { video: await readVideoFile(source.fileName) };
    const result = await this.reels.fetchReel(source.reelCode ?? '');
    if (!('video' in result)) throw new Error(`Instagram: ${result.problem}`);
    return { video: result.video, published: result.published };
  }

  /** Puts the ranked cards (and, when something changed, a fresh summary of the patterns) into the knowledge folder. */
  private async publish(sources: WinnerSource[], summarize: boolean): Promise<{ inLibrary: number; dropped: number }> {
    const cards = await this.collectCards(sources);
    if (cards.length === 0) return { inLibrary: 0, dropped: 0 };
    const top = buildTopReels(cards);
    const needSummary = summarize || !(await patternsExist());
    const patterns = needSummary ? await this.summarize(cards) : undefined;
    await writeLibrary({ patterns, topReels: top.text });
    return { inLibrary: top.included, dropped: top.dropped };
  }

  /** The numbers come from the current list, so changed views are picked up without analysing the reel again. */
  private async collectCards(sources: WinnerSource[]): Promise<WinnerCard[]> {
    const cards: WinnerCard[] = [];
    for (const source of sources) {
      const body = await loadCardBody(source.id);
      if (body) cards.push({ id: source.id, views: source.views, note: source.note, body });
    }
    return cards;
  }

  private async summarize(cards: WinnerCard[]): Promise<string> {
    const summary = await this.claude.ask({
      model: envConfig.modelEvaluate,
      system: [{ type: 'text', text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: `${PATTERNS_INSTRUCTION}\n\n${cardsForSummary(cards)}` }],
      maxTokens: SUMMARY_MAX_TOKENS,
    });
    return `${PATTERNS_FILE_HEADER}\n\n${summary}`;
  }
}

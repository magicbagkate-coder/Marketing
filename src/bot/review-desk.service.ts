import { Injectable } from '@nestjs/common';

import type { DossierLookup, ReelDossier } from '@/assistant/reel-talk.service';
import type { ReviewResult } from '@/assistant/review-result';
import type { ReviewInput } from '@/assistant/video-review.service';

import { ReelTalkService } from '@/assistant/reel-talk.service';
import { VideoReviewService } from '@/assistant/video-review.service';
import { REEL_PROBLEM_TEXTS } from '@/bot/bot.texts';
import { OwnReelService } from '@/instagram/own-reel.service';
import { stripReelLinks } from '@/instagram/reel-link';

/** One place for video reviews (an uploaded file or a link to one of our reels) and for the talk about a reviewed video. */
@Injectable()
export class ReviewDesk {
  constructor(
    private readonly reviews: VideoReviewService,
    private readonly reels: OwnReelService,
    private readonly talks: ReelTalkService,
  ) {}

  file(input: ReviewInput): Promise<ReviewResult> {
    return this.reviews.review(input);
  }

  /** Returns the review; when the reel cannot be found or downloaded, the answer explains why and the digest is empty. */
  async link(code: string, message: string, screenshot?: Buffer): Promise<ReviewResult> {
    const reel = await this.reels.fetchReel(code);
    if (reel.problem) return { answer: REEL_PROBLEM_TEXTS[reel.problem], digest: '' };
    const notes = stripReelLinks(message);
    return this.reviews.review({ media: reel.video, kind: 'video', caption: notes, published: reel.published, screenshot });
  }

  /** Remembers a finished review under the ids of the bot's messages, so that replies to them continue the talk. */
  rememberReview(chatId: number, messageIds: number[], review: ReviewResult): void {
    if (review.digest) this.talks.start(chatId, messageIds, review);
  }

  findDossier(lookup: DossierLookup): ReelDossier | undefined {
    return this.talks.find(lookup);
  }

  ask(dossier: ReelDossier, question: string): Promise<string> {
    return this.talks.answer(dossier, question);
  }

  rememberAnswer(chatId: number, messageIds: number[], dossier: ReelDossier): void {
    this.talks.link(chatId, messageIds, dossier);
  }
}

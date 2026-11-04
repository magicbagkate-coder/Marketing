import { Injectable } from '@nestjs/common';

import type { ReviewInput } from '@/assistant/video-review.service';

import { VideoReviewService } from '@/assistant/video-review.service';
import { REEL_PROBLEM_TEXTS } from '@/bot/bot.texts';
import { OwnReelService } from '@/instagram/own-reel.service';
import { stripReelLinks } from '@/instagram/reel-link';

/** One place for video reviews: an uploaded file or a link to one of our own reels. */
@Injectable()
export class ReviewDesk {
  constructor(
    private readonly reviews: VideoReviewService,
    private readonly reels: OwnReelService,
  ) {}

  file(input: ReviewInput): Promise<string> {
    return this.reviews.review(input);
  }

  /** Returns the review, or a short explanation when the reel cannot be found or downloaded. */
  async link(code: string, message: string, screenshot?: Buffer): Promise<string> {
    const reel = await this.reels.fetchReel(code);
    if (reel.problem) return REEL_PROBLEM_TEXTS[reel.problem];
    const notes = stripReelLinks(message);
    return this.reviews.review({ media: reel.video, kind: 'video', caption: notes, published: reel.published, screenshot });
  }
}

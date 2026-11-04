import { Injectable, Logger } from '@nestjs/common';

import type { OwnPost, PostProblem } from '@/instagram/own-posts';

import { envConfig } from '@/config/env.config';
import { findVideoPost } from '@/instagram/own-posts';
import { downloadReel } from '@/instagram/reel-download';
import { describePublished } from '@/instagram/reel-facts';

export type ReelProblem = PostProblem | 'not-configured' | 'too-big';
export type ReelResult = { problem: ReelProblem } | { problem?: undefined; video: Buffer; published: string };

const isConfigured = (): boolean => Boolean(envConfig.instagramToken && envConfig.instagramBusinessId);

/** Finds one of our own published reels by its Instagram link and downloads the video. */
@Injectable()
export class OwnReelService {
  private readonly logger = new Logger(OwnReelService.name);

  async fetchReel(code: string): Promise<ReelResult> {
    if (!isConfigured()) return { problem: 'not-configured' };
    const post = await findVideoPost({ businessId: envConfig.instagramBusinessId, token: envConfig.instagramToken, code });
    return typeof post === 'string' ? { problem: post } : this.download(post);
  }

  private async download(post: OwnPost): Promise<ReelResult> {
    const video = await downloadReel(post.mediaUrl);
    this.logger.log(`Reel of @${post.username}: ${video ? `${video.length} bytes` : 'too big'}`);
    return video ? { video, published: describePublished(post) } : { problem: 'too-big' };
  }
}

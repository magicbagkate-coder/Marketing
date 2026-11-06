import { Injectable, Logger } from '@nestjs/common';

import type { BulkResult, OwnPost, PostProblem } from '@/instagram/own-posts';

import { envConfig } from '@/config/env.config';
import { WINNERS_MAX_PAGES } from '@/instagram/instagram.constants';
import { findOwnPosts, findVideoPost, videoProblem } from '@/instagram/own-posts';
import { downloadReel } from '@/instagram/reel-download';
import { describePublished } from '@/instagram/reel-facts';

export type ReelProblem = PostProblem | 'not-configured' | 'too-big';
export type ReelResult = { problem: ReelProblem } | { problem?: undefined; video: Buffer; published: string };

const isConfigured = (): boolean => Boolean(envConfig.instagramToken && envConfig.instagramBusinessId);

/** Finds our own published reels by their Instagram links and downloads the videos. */
@Injectable()
export class OwnReelService {
  private readonly logger = new Logger(OwnReelService.name);

  async fetchReel(code: string): Promise<ReelResult> {
    if (!isConfigured()) return { problem: 'not-configured' };
    const post = await findVideoPost({ businessId: envConfig.instagramBusinessId, token: envConfig.instagramToken, code });
    return typeof post === 'string' ? { problem: post } : this.fromPost(post);
  }

  /** Finds many reels deep in the history of both accounts in one pass (for the library of winning reels). */
  async locate(codes: string[]): Promise<BulkResult> {
    if (!isConfigured()) return { posts: new Map(), problem: 'not-configured' };
    return findOwnPosts({ businessId: envConfig.instagramBusinessId, token: envConfig.instagramToken, codes, maxPages: WINNERS_MAX_PAGES });
  }

  /** Downloads the video of a post that has already been found. */
  async fromPost(post: OwnPost): Promise<ReelResult> {
    const problem = videoProblem(post);
    if (problem) return { problem };
    const video = await downloadReel(post.mediaUrl);
    this.logger.log(`Reel of @${post.username}: ${video ? `${video.length} bytes` : 'too big'}`);
    return video ? { video, published: describePublished(post) } : { problem: 'too-big' };
  }
}

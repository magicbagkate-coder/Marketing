import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';

import type { Frame, Transcript } from '@/assistant/review-content';
import type { MediaKind } from '@/bot/command-parser';
import type { VideoInfo } from '@/media/ffmpeg';
import type Anthropic from '@anthropic-ai/sdk';

import { buildSystemBlocks } from '@/assistant/assistant-prompts';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { buildPhotoContent, buildReviewContent } from '@/assistant/review-content';
import { envConfig } from '@/config/env.config';
import { extractAudio, extractFrame, probeVideo } from '@/media/ffmpeg';
import { pickFrameTimes } from '@/media/frame-times';
import { transcribeAudio } from '@/media/transcriber';

export type ReviewInput = {
  media: Buffer;
  kind: MediaKind;
  caption: string;
  /** Set when the video is one of our published reels: facts and caption taken from Instagram. */
  published?: string;
  /** Screenshot of the reel's Instagram statistics (views, reach, saves) sent by the employee. */
  screenshot?: Buffer;
};

const MAX_FRAMES = 12;
const REVIEW_MAX_TOKENS = 16_000;

/** Looks at a video (frames and speech) or a picture and evaluates it against the knowledge base. */
@Injectable()
export class VideoReviewService {
  private readonly logger = new Logger(VideoReviewService.name);

  constructor(
    private readonly claude: ClaudeChatService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async review(input: ReviewInput): Promise<string> {
    const workDir = await mkdtemp(join(tmpdir(), 'review-'));
    try {
      const content = input.kind === 'photo' ? buildPhotoContent(input.media.toString('base64'), input.caption) : await this.prepareVideo(input, workDir);
      return await this.claude.ask({
        model: envConfig.modelEvaluate,
        system: buildSystemBlocks(this.knowledge.textFor('review')),
        messages: [{ role: 'user', content }],
        maxTokens: REVIEW_MAX_TOKENS,
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async prepareVideo(input: ReviewInput, workDir: string): Promise<Anthropic.ContentBlockParam[]> {
    const videoPath = join(workDir, 'input.mp4');
    await writeFile(videoPath, input.media);
    const info = await probeVideo(videoPath);
    const frames = await this.extractFrames(videoPath, info, workDir);
    const transcript = await this.recognizeSpeech(videoPath, info, workDir);
    this.logger.log(`Video review: ${info.durationSec.toFixed(1)} s, ${frames.length} frames, speech ${transcript.status}`);
    const screenshot = input.screenshot?.toString('base64');
    return buildReviewContent({ info, frames, transcript, caption: input.caption, published: input.published, screenshot });
  }

  private async extractFrames(videoPath: string, info: VideoInfo, workDir: string): Promise<Frame[]> {
    const frames: Frame[] = [];
    for (const second of pickFrameTimes(info.durationSec, MAX_FRAMES)) {
      const outputPath = join(workDir, `frame-${frames.length}-${second}.jpg`);
      try {
        await extractFrame({ inputPath: videoPath, second, outputPath });
        frames.push({ second, base64: (await readFile(outputPath)).toString('base64') });
      } catch (error) {
        this.logger.debug(`Frame at ${second} s skipped: ${String(error)}`);
      }
    }
    return frames;
  }

  private async recognizeSpeech(videoPath: string, info: VideoInfo, workDir: string): Promise<Transcript> {
    if (!info.hasAudio) return { status: 'no-audio', text: '' };
    if (!envConfig.openaiApiKey) return { status: 'no-key', text: '' };
    try {
      const audioPath = join(workDir, 'audio.mp3');
      await extractAudio(videoPath, audioPath);
      const text = await transcribeAudio(audioPath);
      return text ? { status: 'ok', text } : { status: 'silent', text: '' };
    } catch (error) {
      this.logger.warn(`Speech recognition failed: ${String(error)}`);
      return { status: 'failed', text: '' };
    }
  }
}

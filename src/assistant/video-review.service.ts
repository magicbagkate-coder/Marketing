import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';

import type { Frame, Transcript } from '@/assistant/review-content';
import type { ReviewResult } from '@/assistant/review-result';
import type { MediaKind } from '@/bot/command-parser';
import type { VideoInfo } from '@/media/ffmpeg';
import type Anthropic from '@anthropic-ai/sdk';

import { buildSystemBlocks } from '@/assistant/assistant-prompts';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { buildLookContent, buildPhotoContent, buildReviewContent, describeFacts, describeLook, describePhotoFacts } from '@/assistant/review-content';
import { buildDigest, splitFramesLog } from '@/assistant/review-result';
import { envConfig } from '@/config/env.config';
import { extractAudio, extractFrame, probeVideo } from '@/media/ffmpeg';
import { pickFrameTimes } from '@/media/frame-times';
import { detectImageType } from '@/media/image-type';
import { transcribeAudio } from '@/media/transcriber';
import { WINNER_CARD_INSTRUCTION } from '@/winners/winners.texts';

export type ReviewInput = {
  media: Buffer;
  kind: MediaKind;
  caption: string;
  /** Set when the video is one of our published reels: facts and caption taken from Instagram. */
  published?: string;
  /** Screenshot of the reel's Instagram statistics (views, reach, saves) sent by the employee. */
  screenshot?: Buffer;
  /** Replaces the usual review instruction. */
  instruction?: string;
  /** How many frames to cut out of the video; more frames give a more exact breakdown by seconds. */
  maxFrames?: number;
};

export type LookInput = {
  images: Buffer[];
  question: string;
  replyContext: string;
};

const LOOK_MAX_TOKENS = 8000;

type PreparedReview = {
  content: Anthropic.ContentBlockParam[];
  /** The same facts as text, kept for follow-up questions. */
  facts: string;
};

const MAX_FRAMES = 12;
const CARD_FRAMES = 20;
const REVIEW_MAX_TOKENS = 16_000;
const CARD_MAX_TOKENS = 3000;

const preparePhoto = (input: ReviewInput): PreparedReview => ({
  content: buildPhotoContent(input.media.toString('base64'), input.caption),
  facts: describePhotoFacts(input.caption),
});

/** Looks at a video (frames and speech) or a picture and evaluates it against the knowledge base. */
@Injectable()
export class VideoReviewService {
  private readonly logger = new Logger(VideoReviewService.name);

  constructor(
    private readonly claude: ClaudeChatService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async review(input: ReviewInput): Promise<ReviewResult> {
    return this.inWorkDir(async (workDir) => {
      const prepared = input.kind === 'photo' ? preparePhoto(input) : await this.prepareVideo(input, workDir);
      const raw = await this.claude.ask({
        model: envConfig.modelEvaluate,
        system: buildSystemBlocks(this.knowledge.textFor('review')),
        messages: [{ role: 'user', content: prepared.content }],
        maxTokens: REVIEW_MAX_TOKENS,
      });
      const { answer, framesLog } = splitFramesLog(raw);
      return { answer, digest: buildDigest(prepared.facts, framesLog) };
    });
  }

  /** Writes the card of a winning reel: frames and speech go to Claude with the card instruction instead of a review. */
  async card(input: ReviewInput): Promise<string> {
    return this.inWorkDir(async (workDir) => {
      const prepared = await this.prepareVideo({ ...input, instruction: WINNER_CARD_INSTRUCTION, maxFrames: CARD_FRAMES }, workDir);
      return this.claude.ask({
        model: envConfig.modelEvaluate,
        system: buildSystemBlocks(this.knowledge.textFor('review')),
        messages: [{ role: 'user', content: prepared.content }],
        maxTokens: CARD_MAX_TOKENS,
      });
    });
  }

  /** Answers a question about several pictures (choose the best product, compare covers) against the audience portrait. */
  async look(input: LookInput): Promise<ReviewResult> {
    const facts = describeLook(input.images.length, input.question, input.replyContext);
    const images = input.images.map((image) => ({ base64: image.toString('base64'), mediaType: detectImageType(image) }));
    const raw = await this.claude.ask({
      model: envConfig.modelEvaluate,
      system: buildSystemBlocks(this.knowledge.textFor('review')),
      messages: [{ role: 'user', content: buildLookContent(images, facts) }],
      maxTokens: LOOK_MAX_TOKENS,
    });
    const { answer, framesLog } = splitFramesLog(raw);
    this.logger.log(`Look at ${images.length} pictures`);
    return { answer, digest: buildDigest(facts, framesLog) };
  }

  private async inWorkDir<T>(task: (workDir: string) => Promise<T>): Promise<T> {
    const workDir = await mkdtemp(join(tmpdir(), 'review-'));
    try {
      return await task(workDir);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async prepareVideo(input: ReviewInput, workDir: string): Promise<PreparedReview> {
    const videoPath = join(workDir, 'input.mp4');
    await writeFile(videoPath, input.media);
    const info = await probeVideo(videoPath);
    const frames = await this.extractFrames(videoPath, info, { workDir, count: input.maxFrames ?? MAX_FRAMES });
    const transcript = await this.recognizeSpeech(videoPath, info, workDir);
    this.logger.log(`Video review: ${info.durationSec.toFixed(1)} s, ${frames.length} frames, speech ${transcript.status}`);
    const screenshot = input.screenshot?.toString('base64');
    const material = { info, frames, transcript, caption: input.caption, published: input.published, screenshot, instruction: input.instruction };
    return { content: buildReviewContent(material), facts: describeFacts(material) };
  }

  private async extractFrames(videoPath: string, info: VideoInfo, cut: { workDir: string; count: number }): Promise<Frame[]> {
    const frames: Frame[] = [];
    for (const second of pickFrameTimes(info.durationSec, cut.count)) {
      const outputPath = join(cut.workDir, `frame-${frames.length}-${second}.jpg`);
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

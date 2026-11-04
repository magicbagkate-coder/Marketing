import { Injectable, Logger } from '@nestjs/common';

import type { IntentKind, MediaRef, MessageIntent } from '@/bot/command-parser';
import type { BotIdentity, TelegramMessage, TelegramUpdate } from '@/telegram/telegram.types';

import { AssistantService } from '@/assistant/assistant.service';
import { VideoReviewService } from '@/assistant/video-review.service';
import {
  buildHelpText,
  buildIdText,
  buildNoAccessText,
  buildReloadedText,
  BUSY_TEXT,
  ERROR_TEXT,
  LIMIT_REACHED_TEXT,
  NEED_MEDIA_TEXT,
  PROCESSING_TEXT,
  VIDEO_TOO_BIG_TEXT,
  VIDEO_TOO_LONG_TEXT,
} from '@/bot/bot.texts';
import { parseMessage } from '@/bot/command-parser';
import { RateLimiter } from '@/bot/rate-limiter';
import { envConfig } from '@/config/env.config';
import { MAX_DOWNLOAD_BYTES } from '@/telegram/telegram.constants';
import { TelegramApiService } from '@/telegram/telegram-api.service';

const MAX_VIDEO_SECONDS = 120;
const MAX_PARALLEL_REVIEWS = 2;
const DAILY_LIMIT = 40;
const TYPING_INTERVAL_MS = 4000;

const senderId = (message: TelegramMessage): number => message.from?.id ?? 0;
const describeFailure = (error: unknown): string => (String(error).includes('too big') ? VIDEO_TOO_BIG_TEXT : ERROR_TEXT);

function validateMedia(media: MediaRef | undefined): string | undefined {
  if (!media) return NEED_MEDIA_TEXT;
  if (media.sizeBytes > MAX_DOWNLOAD_BYTES) return VIDEO_TOO_BIG_TEXT;
  return media.durationSec > MAX_VIDEO_SECONDS ? VIDEO_TOO_LONG_TEXT : undefined;
}

/** Decides who may ask what and runs the task: ideas, scripts, chat, video review. Works in the group and in private chats. */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly limiter = new RateLimiter(DAILY_LIMIT);
  private identity: BotIdentity = { id: 0, username: '' };
  private activeReviews = 0;

  constructor(
    private readonly api: TelegramApiService,
    private readonly assistant: AssistantService,
    private readonly reviews: VideoReviewService,
  ) {}

  setIdentity(identity: BotIdentity): void {
    this.identity = identity;
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message) return;
    try {
      await this.routeMessage(message);
    } catch (error) {
      this.logger.error(`Message handling failed: ${String(error)}`);
      await this.safeReply(message, describeFailure(error));
    }
  }

  private async routeMessage(message: TelegramMessage): Promise<void> {
    const intent = parseMessage(message, this.identity);
    if (intent.kind === 'ignore') return;
    const userId = senderId(message);
    const open = this.openReply(intent.kind, userId);
    if (open) return this.reply(message, open);
    const denial = this.checkAccess(userId);
    if (denial) return this.reply(message, denial);
    this.logger.log(`Request from user ${userId}: ${intent.kind}`);
    await this.runTask(message, intent);
  }

  /** Answers anyone: the id command is how new people learn their number. */
  private openReply(kind: IntentKind, userId: number): string | undefined {
    if (kind === 'id') return buildIdText(userId);
    return kind === 'help' ? buildHelpText(this.identity.username) : undefined;
  }

  private checkAccess(userId: number): string | undefined {
    if (!envConfig.allowedUserIds.includes(userId)) return buildNoAccessText(userId);
    return this.limiter.tryConsume(userId) ? undefined : LIMIT_REACHED_TEXT;
  }

  private async runTask(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    switch (intent.kind) {
      case 'review':
        return this.reviewMedia(message, intent);
      case 'reload':
        return this.reloadKnowledge(message);
      default:
        return this.answerText(message, intent);
    }
  }

  private async answerText(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    const request = { chatId: message.chat.id, text: intent.text, replyContext: intent.replyContext };
    const answer = await this.withTyping(message.chat.id, () => this.assistant.answer(intent.kind, request));
    await this.reply(message, answer);
  }

  private async reviewMedia(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    const media = intent.media;
    const problem = validateMedia(media);
    if (!media || problem) return this.reply(message, problem ?? NEED_MEDIA_TEXT);
    if (this.activeReviews >= MAX_PARALLEL_REVIEWS) return this.reply(message, BUSY_TEXT);
    this.activeReviews += 1;
    try {
      await this.runReview(message, media, intent.text);
    } finally {
      this.activeReviews -= 1;
    }
  }

  private async runReview(message: TelegramMessage, media: MediaRef, caption: string): Promise<void> {
    await this.reply(message, PROCESSING_TEXT);
    const buffer = await this.api.downloadFile(media.fileId);
    const answer = await this.withTyping(message.chat.id, () => this.reviews.review({ media: buffer, kind: media.kind, caption }));
    await this.reply(message, answer);
  }

  private async reloadKnowledge(message: TelegramMessage): Promise<void> {
    await this.reply(message, buildReloadedText(await this.assistant.reloadKnowledge()));
  }

  private async withTyping<T>(chatId: number, task: () => Promise<T>): Promise<T> {
    const timer = setInterval(() => void this.api.sendTyping(chatId), TYPING_INTERVAL_MS);
    void this.api.sendTyping(chatId);
    try {
      return await task();
    } finally {
      clearInterval(timer);
    }
  }

  private reply(message: TelegramMessage, text: string): Promise<void> {
    const replyTo = message.chat.type === 'private' ? undefined : message.message_id;
    return this.api.sendText({ chatId: message.chat.id, text, replyTo });
  }

  private async safeReply(message: TelegramMessage, text: string): Promise<void> {
    try {
      await this.reply(message, text);
    } catch (error) {
      this.logger.warn(`Could not send the reply: ${String(error)}`);
    }
  }
}

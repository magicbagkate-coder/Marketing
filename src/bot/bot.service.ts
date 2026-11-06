import { Injectable, Logger } from '@nestjs/common';

import type { ReelDossier } from '@/assistant/reel-talk.service';
import type { ReviewResult } from '@/assistant/review-result';
import type { IntentKind, MediaRef, MessageIntent } from '@/bot/command-parser';
import type { BotIdentity, TelegramMessage, TelegramUpdate } from '@/telegram/telegram.types';

import { AssistantService } from '@/assistant/assistant.service';
import { AlbumBuffer } from '@/bot/album-buffer';
import {
  buildHelpText,
  buildIdText,
  buildLookingText,
  buildNoAccessText,
  buildReloadedText,
  buildScriptingText,
  BUSY_TEXT,
  ERROR_TEXT,
  FETCHING_REEL_TEXT,
  LIMIT_REACHED_TEXT,
  ONE_REEL_AT_A_TIME_TEXT,
  PROCESSING_TEXT,
  VIDEO_TOO_BIG_TEXT,
} from '@/bot/bot.texts';
import { parseAlbum, parseMessage } from '@/bot/command-parser';
import { validateLooks, validateMedia } from '@/bot/media-validation';
import { RateLimiter } from '@/bot/rate-limiter';
import { ReviewDesk } from '@/bot/review-desk.service';
import { envConfig } from '@/config/env.config';
import { TelegramApiService } from '@/telegram/telegram-api.service';

const MAX_PARALLEL_REVIEWS = 2;
const DAILY_LIMIT = 40;
const TYPING_INTERVAL_MS = 4000;

const senderId = (message: TelegramMessage): number => message.from?.id ?? 0;
const describeFailure = (error: unknown): string => (String(error).includes('too big') ? VIDEO_TOO_BIG_TEXT : ERROR_TEXT);

/** Decides who may ask what and runs the task: ideas, scripts, chat, video review. Works in the group and in private chats. */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly limiter = new RateLimiter(DAILY_LIMIT);
  private identity: BotIdentity = { id: 0, username: '' };
  private activeReviews = 0;
  private readonly albums = new AlbumBuffer((messages) => void this.routeAlbum(messages));

  constructor(
    private readonly api: TelegramApiService,
    private readonly assistant: AssistantService,
    private readonly reviews: ReviewDesk,
  ) {}

  setIdentity(identity: BotIdentity): void {
    this.identity = identity;
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message || this.albums.add(message)) return;
    await this.guarded(message, () => this.routeMessage(message, parseMessage(message, this.identity)));
  }

  /** All the pictures of an album have arrived: they are one request, decided by the album's caption. */
  private routeAlbum(messages: TelegramMessage[]): Promise<void> {
    return this.guarded(messages[0], () => this.routeMessage(messages[0], parseAlbum(messages, this.identity)));
  }

  private async guarded(message: TelegramMessage, task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      this.logger.error(`Message handling failed: ${String(error)}`);
      await this.safeReply(message, describeFailure(error));
    }
  }

  private async routeMessage(message: TelegramMessage, intent: MessageIntent): Promise<void> {
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
      case 'look':
        return this.lookAtPictures(message, intent);
      case 'reload':
        return this.reloadKnowledge(message);
      default:
        return this.answerText(message, intent);
    }
  }

  /** A reply to the bot's review (or, in a private chat, a fresh question) continues the talk about that video. */
  private findDossier(message: TelegramMessage, intent: MessageIntent): ReelDossier | undefined {
    if (intent.kind !== 'chat') return undefined;
    return this.reviews.findDossier({
      chatId: message.chat.id,
      replyTo: message.reply_to_message?.message_id,
      isPrivate: message.chat.type === 'private',
    });
  }

  private async discuss(message: TelegramMessage, dossier: ReelDossier, question: string): Promise<void> {
    const answer = await this.withTyping(message.chat.id, () => this.reviews.ask(dossier, question));
    this.reviews.rememberAnswer(message.chat.id, await this.replyIds(message, answer), dossier);
  }

  private async answerText(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    const dossier = this.findDossier(message, intent);
    if (dossier) return this.discuss(message, dossier, intent.text);
    const request = { chatId: message.chat.id, text: intent.text, replyContext: intent.replyContext };
    const answer = await this.withTyping(message.chat.id, () => this.assistant.answer(intent.kind, request));
    await this.reply(message, answer);
  }

  private async reviewMedia(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    if (intent.reelLinks > 1) return this.reply(message, ONE_REEL_AT_A_TIME_TEXT);
    const problem = intent.media || !intent.reelCode ? validateMedia(intent.media) : undefined;
    if (problem) return this.reply(message, problem);
    await this.withSlot(message, () => this.runReviewTask(message, intent));
  }

  /** Several heavy tasks (video, many pictures) at once would be too slow and costly: only a few run in parallel. */
  private async withSlot(message: TelegramMessage, task: () => Promise<void>): Promise<void> {
    if (this.activeReviews >= MAX_PARALLEL_REVIEWS) return this.reply(message, BUSY_TEXT);
    this.activeReviews += 1;
    try {
      await task();
    } finally {
      this.activeReviews -= 1;
    }
  }

  /** Pictures with a question (which bag suits the audience better): answered as a question, not as a reel review. */
  private async lookAtPictures(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    const looks = intent.looks ?? [];
    const problem = validateLooks(looks);
    if (problem) return this.reply(message, problem);
    await this.withSlot(message, () => this.runLook(message, intent, looks));
  }

  private async runLook(message: TelegramMessage, intent: MessageIntent, looks: MediaRef[]): Promise<void> {
    await this.reply(message, buildLookingText(looks.length));
    const images = await Promise.all(looks.map((look) => this.api.downloadFile(look.fileId)));
    const request = { images, question: intent.text, replyContext: intent.replyContext };
    await this.sendReview(message, await this.withTyping(message.chat.id, () => this.reviews.look(request)));
  }

  /** A script is written for the bag on the photos; without photos it is an ordinary text request. */
  private async writeScript(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    const looks = intent.looks ?? [];
    if (looks.length === 0) return this.answerText(message, intent);
    const problem = validateLooks(looks);
    if (problem) return this.reply(message, problem);
    await this.withSlot(message, () => this.runScript(message, intent, looks));
  }

  private async runScript(message: TelegramMessage, intent: MessageIntent, looks: MediaRef[]): Promise<void> {
    await this.reply(message, buildScriptingText(looks.length));
    const images = await Promise.all(looks.map((look) => this.api.downloadFile(look.fileId)));
    const request = { chatId: message.chat.id, text: intent.text, replyContext: intent.replyContext, images };
    await this.reply(message, await this.withTyping(message.chat.id, () => this.assistant.scriptFromPictures(request)));
  }

  private runReviewTask(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    if (intent.media) return this.runReview(message, intent.media, intent.text);
    return this.runReelReview(message, intent);
  }

  private async runReelReview(message: TelegramMessage, intent: MessageIntent): Promise<void> {
    await this.reply(message, FETCHING_REEL_TEXT);
    const screenshot = intent.screenshot ? await this.api.downloadFile(intent.screenshot.fileId) : undefined;
    const review = await this.withTyping(message.chat.id, () => this.reviews.link(intent.reelCode ?? '', intent.text, screenshot));
    await this.sendReview(message, review);
  }

  private async sendReview(message: TelegramMessage, review: ReviewResult): Promise<void> {
    this.reviews.rememberReview(message.chat.id, await this.replyIds(message, review.answer), review);
  }

  private async runReview(message: TelegramMessage, media: MediaRef, caption: string): Promise<void> {
    await this.reply(message, PROCESSING_TEXT);
    const buffer = await this.api.downloadFile(media.fileId);
    const review = await this.withTyping(message.chat.id, () => this.reviews.file({ media: buffer, kind: media.kind, caption }));
    await this.sendReview(message, review);
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

  private async reply(message: TelegramMessage, text: string): Promise<void> {
    await this.replyIds(message, text);
  }

  /** Sends the reply and returns the ids of the messages it was split into. */
  private replyIds(message: TelegramMessage, text: string): Promise<number[]> {
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

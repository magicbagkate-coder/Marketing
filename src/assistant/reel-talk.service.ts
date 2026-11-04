import { Injectable } from '@nestjs/common';

import type { MemoryTurn } from '@/assistant/chat-memory';
import type { ReviewResult } from '@/assistant/review-result';
import type Anthropic from '@anthropic-ai/sdk';

import { FOLLOW_UP_ACK, FOLLOW_UP_RULES } from '@/assistant/assistant.texts';
import { buildSystemBlocks } from '@/assistant/assistant-prompts';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { clip } from '@/common/clip';
import { envConfig } from '@/config/env.config';
import { DigestStore } from '@/digest/digest-store';

/** What the bot remembers about a reviewed video: the facts as text and the conversation about it. */
export type ReelDossier = {
  digest: string;
  turns: MemoryTurn[];
  savedAt: number;
};

export type DossierLookup = {
  chatId: number;
  /** Telegram id of the message the employee replied to. */
  replyTo?: number;
  isPrivate: boolean;
};

const REPLY_TTL_MS = 6 * 60 * 60 * 1000;
const PRIVATE_TTL_MS = 30 * 60 * 1000;
const MAX_REMEMBERED_MESSAGES = 300;
const MAX_TURNS = 12;
const TRENDS_LIMIT = 5000;
const MAX_TURN_CHARS = 6000;
const FOLLOW_UP_MAX_TOKENS = 6000;
const REVIEW_REQUEST = 'Разбери ролик.';

const keyOf = (chatId: number, messageId: number): string => `${chatId}:${messageId}`;
const isFresh = (dossier: ReelDossier | undefined, ttlMs: number): dossier is ReelDossier => dossier !== undefined && Date.now() - dossier.savedAt < ttlMs;

/**
 * Keeps the conversation about a reviewed video without keeping the video: after a review the employee can ask
 * more about it (reply to the bot's message) and nothing has to be uploaded or recognised again.
 */
@Injectable()
export class ReelTalkService {
  private readonly byMessage = new Map<string, ReelDossier>();
  private readonly latestByChat = new Map<number, ReelDossier>();

  constructor(
    private readonly claude: ClaudeChatService,
    private readonly knowledge: KnowledgeService,
    private readonly digests: DigestStore,
  ) {}

  /** Starts a dossier from a finished review and links the bot's messages to it. */
  start(chatId: number, messageIds: number[], review: ReviewResult): void {
    const turns: MemoryTurn[] = [
      { role: 'user', content: REVIEW_REQUEST },
      { role: 'assistant', content: clip(review.answer, MAX_TURN_CHARS) },
    ];
    this.link(chatId, messageIds, { digest: review.digest, turns, savedAt: Date.now() });
  }

  /** Makes the given bot messages lead to the dossier, so a reply to any of them continues the conversation. */
  link(chatId: number, messageIds: number[], dossier: ReelDossier): void {
    dossier.savedAt = Date.now();
    for (const messageId of messageIds) this.byMessage.set(keyOf(chatId, messageId), dossier);
    this.latestByChat.set(chatId, dossier);
    this.prune();
  }

  /** A reply to the bot's message finds its video; in a private chat the latest video of the last half hour also counts. */
  find(lookup: DossierLookup): ReelDossier | undefined {
    const anchored = lookup.replyTo === undefined ? undefined : this.byMessage.get(keyOf(lookup.chatId, lookup.replyTo));
    if (isFresh(anchored, REPLY_TTL_MS)) return anchored;
    const latest = lookup.isPrivate ? this.latestByChat.get(lookup.chatId) : undefined;
    return isFresh(latest, PRIVATE_TTL_MS) ? latest : undefined;
  }

  async answer(dossier: ReelDossier, question: string): Promise<string> {
    const reply = await this.claude.ask({
      model: envConfig.modelCreative,
      system: [...buildSystemBlocks(this.knowledge.textFor('review')), { type: 'text', text: FOLLOW_UP_RULES }, ...(await this.trendsBlock())],
      messages: [
        { role: 'user', content: `Сохранённые материалы (видео и картинки не сохранены):\n${dossier.digest}` },
        { role: 'assistant', content: FOLLOW_UP_ACK },
        ...dossier.turns,
        { role: 'user', content: question },
      ],
      maxTokens: FOLLOW_UP_MAX_TOKENS,
    });
    const turns = [...dossier.turns, { role: 'user' as const, content: clip(question, MAX_TURN_CHARS) }, { role: 'assistant' as const, content: clip(reply, MAX_TURN_CHARS) }];
    dossier.turns = turns.slice(-MAX_TURNS);
    return reply;
  }

  /** Today's trends, so that a question like «предложи идею по сегодняшним трендам» works inside a talk about a video too. */
  private async trendsBlock(): Promise<Anthropic.TextBlockParam[]> {
    const trends = await this.digests.load();
    return trends ? [{ type: 'text', text: `Тренды дня из утренней сводки (используй, если сотрудница просит учесть тренды):\n${clip(trends, TRENDS_LIMIT)}` }] : [];
  }

  private prune(): void {
    for (const [key, dossier] of this.byMessage) {
      if (!isFresh(dossier, REPLY_TTL_MS)) this.byMessage.delete(key);
    }
    for (const key of this.byMessage.keys()) {
      if (this.byMessage.size <= MAX_REMEMBERED_MESSAGES) break;
      this.byMessage.delete(key);
    }
  }
}

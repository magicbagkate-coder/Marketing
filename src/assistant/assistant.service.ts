import { Injectable } from '@nestjs/common';

import type { TaskKind } from '@/assistant/assistant-prompts';
import type { IntentKind } from '@/bot/command-parser';
import type Anthropic from '@anthropic-ai/sdk';

import { SCRIPT_PICTURES_NOTE } from '@/assistant/assistant.texts';
import { buildSystemBlocks, buildTaskPrompt } from '@/assistant/assistant-prompts';
import { ChatMemory } from '@/assistant/chat-memory';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { buildPicturesContent } from '@/assistant/review-content';
import { envConfig } from '@/config/env.config';
import { DigestStore } from '@/digest/digest-store';
import { detectImageType } from '@/media/image-type';

export type TaskRequest = {
  chatId: number;
  text: string;
  replyContext: string;
};

export type PicturesRequest = {
  chatId: number;
  text: string;
  replyContext: string;
  images: Buffer[];
};

const CREATIVE_MAX_TOKENS = 8000;
const SCRIPT_MAX_TOKENS = 10_000;

const toTaskKind = (kind: IntentKind): TaskKind => (kind === 'ideas' || kind === 'script' ? kind : 'chat');

/** Ideas, scripts and answers about reels, built on the knowledge base, the library of winning reels and today's trends. */
@Injectable()
export class AssistantService {
  private readonly memory = new ChatMemory();

  constructor(
    private readonly claude: ClaudeChatService,
    private readonly knowledge: KnowledgeService,
    private readonly digests: DigestStore,
  ) {}

  /** Re-reads the knowledge folder and returns how many files it holds. */
  async reloadKnowledge(): Promise<number> {
    return (await this.knowledge.reload()).files;
  }

  async answer(kind: IntentKind, request: TaskRequest): Promise<string> {
    const prompt = await this.buildPrompt(toTaskKind(kind), request);
    const isScript = kind === 'script';
    const messages: Anthropic.MessageParam[] = [...this.memory.history(request.chatId), { role: 'user', content: prompt }];
    const reply = await this.ask(isScript ? envConfig.modelScript : envConfig.modelCreative, messages, isScript ? SCRIPT_MAX_TOKENS : CREATIVE_MAX_TOKENS);
    this.memory.remember(request.chatId, request.text || kind, reply);
    return reply;
  }

  /** A script for the bag on the photos: Claude sees the pictures and writes it from the winning reels. */
  async scriptFromPictures(request: PicturesRequest): Promise<string> {
    const prompt = await this.buildPrompt('script', request);
    const images = request.images.map((image) => ({ base64: image.toString('base64'), mediaType: detectImageType(image) }));
    const content = buildPicturesContent(images, `${SCRIPT_PICTURES_NOTE}\n\n${prompt}`);
    const reply = await this.ask(envConfig.modelScript, [{ role: 'user', content }], SCRIPT_MAX_TOKENS);
    this.memory.remember(request.chatId, `${request.text || 'сценарий'} [фото сумки: ${images.length}]`, reply);
    return reply;
  }

  private async buildPrompt(kind: TaskKind, request: TaskRequest): Promise<string> {
    return buildTaskPrompt({ kind, text: request.text, replyContext: request.replyContext, trends: await this.digests.load() });
  }

  private ask(model: string, messages: Anthropic.MessageParam[], maxTokens: number): Promise<string> {
    return this.claude.ask({ model, system: buildSystemBlocks(this.knowledge.textFor('creative')), messages, maxTokens });
  }
}

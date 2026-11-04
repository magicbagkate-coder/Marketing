import { Injectable } from '@nestjs/common';

import type { TaskKind } from '@/assistant/assistant-prompts';
import type { IntentKind } from '@/bot/command-parser';

import { buildSystemBlocks, buildTaskPrompt } from '@/assistant/assistant-prompts';
import { ChatMemory } from '@/assistant/chat-memory';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { envConfig } from '@/config/env.config';
import { DigestStore } from '@/digest/digest-store';

export type TaskRequest = {
  chatId: number;
  text: string;
  replyContext: string;
};

const CREATIVE_MAX_TOKENS = 8000;

const toTaskKind = (kind: IntentKind): TaskKind => (kind === 'ideas' || kind === 'script' ? kind : 'chat');

/** Ideas, scripts and answers about reels, built on the knowledge base and today's trends. */
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
    const prompt = buildTaskPrompt({
      kind: toTaskKind(kind),
      text: request.text,
      replyContext: request.replyContext,
      trends: await this.digests.load(),
    });
    const reply = await this.claude.ask({
      model: envConfig.modelCreative,
      system: buildSystemBlocks(this.knowledge.get().text),
      messages: [...this.memory.history(request.chatId), { role: 'user', content: prompt }],
      maxTokens: CREATIVE_MAX_TOKENS,
    });
    this.memory.remember(request.chatId, request.text || kind, reply);
    return reply;
  }
}

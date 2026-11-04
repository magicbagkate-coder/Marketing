import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

import { envConfig } from '@/config/env.config';

export type AskOptions = {
  model: string;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  maxTokens: number;
};

const REQUEST_TIMEOUT_MS = 240_000;

/** One place that talks to Claude for the assistant: tasks, chat and video reviews. */
@Injectable()
export class ClaudeChatService {
  private client?: Anthropic;

  async ask(options: AskOptions): Promise<string> {
    const response = await this.getClient().messages.create(
      { model: options.model, max_tokens: options.maxTokens, system: options.system, messages: options.messages },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    if (response.stop_reason === 'refusal') throw new Error('Claude refused to answer');
    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n').trim();
    if (!text) throw new Error('Claude returned an empty answer');
    return text;
  }

  private getClient(): Anthropic {
    if (!envConfig.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    this.client ??= new Anthropic({ apiKey: envConfig.anthropicApiKey });
    return this.client;
  }
}

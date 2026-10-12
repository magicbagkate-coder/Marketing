import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

import type { NewsItem } from '@/sources/source.types';

import { envConfig } from '@/config/env.config';
import { DIGEST_SYSTEM_PROMPT } from '@/digest/digest.texts';
import { buildPromptInput } from '@/digest/digest-format';

const MAX_OUTPUT_TOKENS = 16_000;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

@Injectable()
export class ClaudeDigestService {
  /** Asks Claude to turn the fresh news list into a Russian Telegram-HTML digest. Throws if Claude gives no text. */
  async writeDigest(items: NewsItem[]): Promise<string> {
    if (!envConfig.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    const client = new Anthropic({ apiKey: envConfig.anthropicApiKey });
    const response = await client.beta.messages.create({
      model: envConfig.anthropicModel,
      max_tokens: MAX_OUTPUT_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: DIGEST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPromptInput(items) }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Claude refused to write the digest');
    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n').trim();
    if (!text) throw new Error('Claude returned an empty digest');
    return text;
  }
}

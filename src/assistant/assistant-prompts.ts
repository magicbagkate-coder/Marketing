import type Anthropic from '@anthropic-ai/sdk';

import {
  CHAT_INSTRUCTION,
  DEFAULT_IDEAS_REQUEST,
  DEFAULT_SCRIPT_REQUEST,
  IDEAS_INSTRUCTION,
  KNOWLEDGE_EMPTY,
  KNOWLEDGE_HEADER,
  SCRIPT_INSTRUCTION,
  SYSTEM_PROMPT,
} from '@/assistant/assistant.texts';
import { clip } from '@/common/clip';

export type TaskKind = 'ideas' | 'script' | 'chat';

export type TaskInput = {
  kind: TaskKind;
  text: string;
  replyContext: string;
  trends: string;
};

const CONTEXT_LIMIT = 3000;
const TRENDS_LIMIT = 5000;
const INSTRUCTIONS: { [kind: string]: string } = { ideas: IDEAS_INSTRUCTION, script: SCRIPT_INSTRUCTION, chat: CHAT_INSTRUCTION };
const DEFAULT_REQUESTS: { [kind: string]: string } = { ideas: DEFAULT_IDEAS_REQUEST, script: DEFAULT_SCRIPT_REQUEST, chat: '' };

/** System prompt blocks: the rules, then the knowledge base marked for prompt caching (it is large and rarely changes). */
export function buildSystemBlocks(knowledge: string): Anthropic.TextBlockParam[] {
  const rules: Anthropic.TextBlockParam = { type: 'text', text: SYSTEM_PROMPT };
  if (!knowledge) return [rules, { type: 'text', text: KNOWLEDGE_EMPTY }];
  return [rules, { type: 'text', text: `${KNOWLEDGE_HEADER}\n\n${knowledge}`, cache_control: { type: 'ephemeral' } }];
}

/** The user turn of a content task: instruction, the request, and the context that may help. */
export function buildTaskPrompt(input: TaskInput): string {
  const parts = [INSTRUCTIONS[input.kind], `Запрос сотрудника: ${input.text || DEFAULT_REQUESTS[input.kind]}`];
  if (input.replyContext) parts.push(`Сообщение, на которое ответил сотрудник:\n${clip(input.replyContext, CONTEXT_LIMIT)}`);
  if (input.trends) parts.push(`Тренды дня из утренней сводки:\n${clip(input.trends, TRENDS_LIMIT)}`);
  return parts.join('\n\n');
}

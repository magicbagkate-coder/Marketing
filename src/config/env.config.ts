import { parseIds } from '@/config/parse-ids';

import 'dotenv/config';

const DEFAULT_PORT = 7000;
const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_CREATIVE_MODEL = 'claude-sonnet-5-5';
const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-1';

export type EnvConfig = {
  port: number;
  telegramToken: string;
  telegramChatId: string;
  allowedUserIds: number[];
  anthropicApiKey: string;
  anthropicModel: string;
  modelEvaluate: string;
  modelCreative: string;
  modelScript: string;
  openaiApiKey: string;
  transcriptionModel: string;
  knowledgeDir: string;
  stateDir: string;
  instagramToken: string;
  instagramBusinessId: string;
  metaAppId: string;
  metaAppSecret: string;
};

export const envConfig: EnvConfig = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  allowedUserIds: parseIds(process.env.TELEGRAM_ALLOWED_USER_IDS ?? ''),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
  modelEvaluate: process.env.ANTHROPIC_MODEL_EVALUATE ?? DEFAULT_MODEL,
  modelCreative: process.env.ANTHROPIC_MODEL_CREATIVE ?? DEFAULT_CREATIVE_MODEL,
  modelScript: process.env.ANTHROPIC_MODEL_SCRIPT ?? process.env.ANTHROPIC_MODEL_EVALUATE ?? DEFAULT_MODEL,
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  transcriptionModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? DEFAULT_TRANSCRIPTION_MODEL,
  knowledgeDir: process.env.KNOWLEDGE_DIR ?? 'knowledge',
  stateDir: process.env.STATE_DIR ?? 'state',
  instagramToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? '',
  instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID ?? '',
  metaAppId: process.env.META_APP_ID ?? '',
  metaAppSecret: process.env.META_APP_SECRET ?? '',
};

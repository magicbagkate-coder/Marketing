import 'dotenv/config';

const DEFAULT_PORT = 7000;
const DEFAULT_MODEL = 'claude-opus-5-5';

export type EnvConfig = {
  port: number;
  telegramToken: string;
  telegramChatId: string;
  anthropicApiKey: string;
  anthropicModel: string;
  instagramToken: string;
  instagramBusinessId: string;
  metaAppId: string;
  metaAppSecret: string;
};

export const envConfig: EnvConfig = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
  instagramToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? '',
  instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID ?? '',
  metaAppId: process.env.META_APP_ID ?? '',
  metaAppSecret: process.env.META_APP_SECRET ?? '',
};

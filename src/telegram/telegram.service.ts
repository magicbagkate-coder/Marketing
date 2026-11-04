import { Injectable } from '@nestjs/common';

import { envConfig } from '@/config/env.config';
import { TelegramApiService } from '@/telegram/telegram-api.service';

@Injectable()
export class TelegramService {
  constructor(private readonly api: TelegramApiService) {}

  /** Sends the text to the configured group, split into several messages when it is too long. */
  async sendDigest(text: string): Promise<void> {
    if (!envConfig.telegramToken || !envConfig.telegramChatId) throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    await this.api.sendText({ chatId: envConfig.telegramChatId, text });
  }
}

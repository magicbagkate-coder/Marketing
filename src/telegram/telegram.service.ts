import { Injectable, Logger } from '@nestjs/common';

import { stripHtml } from '@/common/strip-html';
import { envConfig } from '@/config/env.config';
import { splitMessage } from '@/telegram/message-splitter';

const TELEGRAM_API_URL = 'https://api.telegram.org';
const HTML_PARSE_MODE = 'HTML';

type SendOptions = {
  text: string;
  asHtml: boolean;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  /** Sends the text to the configured group, split into several messages when it is too long. */
  async sendDigest(text: string): Promise<void> {
    if (!envConfig.telegramToken || !envConfig.telegramChatId) throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    for (const chunk of splitMessage(text)) await this.sendChunk(chunk);
  }

  private async sendChunk(chunk: string): Promise<void> {
    if (await this.sendMessage({ text: chunk, asHtml: true })) return;
    this.logger.warn('Telegram rejected the HTML message, resending as plain text');
    if (await this.sendMessage({ text: stripHtml(chunk), asHtml: false })) return;
    throw new Error('Telegram rejected the message');
  }

  private async sendMessage(options: SendOptions): Promise<boolean> {
    const response = await fetch(`${TELEGRAM_API_URL}/bot${envConfig.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: envConfig.telegramChatId,
        text: options.text,
        parse_mode: options.asHtml ? HTML_PARSE_MODE : undefined,
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) this.logger.warn(`Telegram answered with status ${response.status}`);
    return response.ok;
  }
}

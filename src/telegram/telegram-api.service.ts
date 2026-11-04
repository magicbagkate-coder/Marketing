import { Injectable, Logger } from '@nestjs/common';

import type { BotCommand, TelegramUpdate, TelegramUser } from '@/telegram/telegram.types';

import { envConfig } from '@/config/env.config';
import { splitMessage } from '@/telegram/message-splitter';
import { toPlainText } from '@/telegram/plain-text';
import { API_TIMEOUT_MS, DOWNLOAD_TIMEOUT_MS, LONG_POLL_SECONDS, MAX_DOWNLOAD_BYTES, TELEGRAM_API_URL } from '@/telegram/telegram.constants';

type ApiResponse<T> = { ok: boolean; result?: T; description?: string };
type FileInfo = { file_path?: string; file_size?: number };

export type SendTextOptions = {
  chatId: number | string;
  text: string;
  replyTo?: number;
};

/** Thin wrapper over the Telegram Bot API. Errors never contain the bot token. */
@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);

  async call<T>(method: string, payload: object, timeoutMs: number = API_TIMEOUT_MS): Promise<T> {
    const response = await fetch(`${TELEGRAM_API_URL}/bot${envConfig.telegramToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await response.json()) as ApiResponse<T>;
    if (!body.ok || body.result === undefined) throw new Error(`Telegram ${method} failed: ${body.description ?? response.status}`);
    return body.result;
  }

  getMe(): Promise<TelegramUser> {
    return this.call<TelegramUser>('getMe', {});
  }

  /** Long polling: waits up to `waitSeconds` for new messages. */
  getUpdates(offset: number, waitSeconds: number = LONG_POLL_SECONDS): Promise<TelegramUpdate[]> {
    const payload = { offset, timeout: waitSeconds, allowed_updates: ['message'] };
    return this.call<TelegramUpdate[]>('getUpdates', payload, (waitSeconds + 15) * 1000);
  }

  async setCommands(commands: BotCommand[]): Promise<void> {
    await this.call('setMyCommands', { commands });
  }

  async sendTyping(chatId: number): Promise<void> {
    try {
      await this.call('sendChatAction', { chat_id: chatId, action: 'typing' });
    } catch (error) {
      this.logger.debug(`sendChatAction failed: ${String(error)}`);
    }
  }

  /** Sends the text, split into several messages when it is too long; falls back to plain text if HTML is rejected. */
  async sendText(options: SendTextOptions): Promise<number[]> {
    const ids: number[] = [];
    for (const chunk of splitMessage(options.text)) ids.push(await this.sendChunk(chunk, options));
    return ids;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const info = await this.call<FileInfo>('getFile', { file_id: fileId });
    if (!info.file_path) throw new Error('Telegram returned no file path');
    if ((info.file_size ?? 0) > MAX_DOWNLOAD_BYTES) throw new Error('Telegram file is too big');
    const response = await fetch(`${TELEGRAM_API_URL}/file/bot${envConfig.telegramToken}/${info.file_path}`, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`File download failed with status ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  private async sendChunk(chunk: string, options: SendTextOptions): Promise<number> {
    const html = await this.trySend(chunk, options, true);
    if (html !== undefined) return html;
    this.logger.warn('Telegram rejected the HTML message, resending as plain text');
    const plain = await this.trySend(toPlainText(chunk), options, false);
    if (plain !== undefined) return plain;
    throw new Error('Telegram rejected the message');
  }

  /** Returns the id of the sent message, or undefined when Telegram rejected it. */
  private async trySend(text: string, options: SendTextOptions, asHtml: boolean): Promise<number | undefined> {
    try {
      const sent = await this.call<{ message_id: number }>('sendMessage', {
        chat_id: options.chatId,
        text,
        parse_mode: asHtml ? 'HTML' : undefined,
        disable_web_page_preview: true,
        reply_to_message_id: options.replyTo,
        allow_sending_without_reply: true,
      });
      return sent.message_id;
    } catch (error) {
      this.logger.warn(`sendMessage failed: ${String(error)}`);
      return undefined;
    }
  }
}

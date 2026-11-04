import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

import { BotService } from '@/bot/bot.service';
import { BOT_COMMANDS } from '@/bot/bot.texts';
import { envConfig } from '@/config/env.config';
import { TelegramApiService } from '@/telegram/telegram-api.service';

const POLL_RETRY_MS = 5000;
const START_RETRY_MS = 10_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Receives Telegram messages by long polling (no public address needed) and hands them to the bot. */
@Injectable()
export class UpdatePollerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(UpdatePollerService.name);
  private running = false;
  private offset = 0;

  constructor(
    private readonly api: TelegramApiService,
    private readonly bot: BotService,
  ) {}

  onApplicationBootstrap(): void {
    if (!envConfig.telegramToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set, the assistant is off');
      return;
    }
    this.running = true;
    void this.run();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async run(): Promise<void> {
    while (this.running && !(await this.prepare())) await sleep(START_RETRY_MS);
    while (this.running) await this.pollOnce();
  }

  /** Learns who the bot is, publishes the command menu and skips messages that arrived while it was off. */
  private async prepare(): Promise<boolean> {
    try {
      const me = await this.api.getMe();
      this.bot.setIdentity({ id: me.id, username: me.username ?? '' });
      await this.api.setCommands(BOT_COMMANDS);
      const [latest] = await this.api.getUpdates(-1, 0);
      if (latest) this.offset = latest.update_id + 1;
      this.logger.log(`Assistant is listening as @${me.username}`);
      return true;
    } catch (error) {
      this.logger.error(`Assistant start-up failed, retrying: ${String(error)}`);
      return false;
    }
  }

  private async pollOnce(): Promise<void> {
    try {
      for (const update of await this.api.getUpdates(this.offset)) {
        this.offset = update.update_id + 1;
        void this.bot.handleUpdate(update);
      }
    } catch (error) {
      this.logger.warn(`Polling failed, retrying: ${String(error)}`);
      await sleep(POLL_RETRY_MS);
    }
  }
}

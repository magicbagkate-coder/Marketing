import { Injectable } from '@nestjs/common';

import { DigestStore } from '@/digest/digest-store';
import { TelegramService } from '@/telegram/telegram.service';

/** Sends the digest to the Telegram group and remembers it for the content assistant. */
@Injectable()
export class DigestPublisher {
  constructor(
    private readonly telegram: TelegramService,
    private readonly store: DigestStore,
  ) {}

  async publish(message: string): Promise<void> {
    await this.telegram.sendDigest(message);
    await this.store.save(message);
  }
}

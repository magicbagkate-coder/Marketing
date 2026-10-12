import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DigestService } from '@/digest/digest.service';
import { DIGEST_CRON, DIGEST_TIME_ZONE } from '@/scheduler/scheduler.constants';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(private readonly digest: DigestService) {}

  @Cron(DIGEST_CRON, { timeZone: DIGEST_TIME_ZONE })
  async runMorningDigest(): Promise<void> {
    try {
      await this.digest.runDigest();
    } catch (error) {
      this.logger.error(`Morning digest failed: ${String(error)}`);
    }
  }
}

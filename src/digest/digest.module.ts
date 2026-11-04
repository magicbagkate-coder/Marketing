import { Module } from '@nestjs/common';

import { NewsCollectorService } from '@/collector/news-collector.service';
import { ClaudeDigestService } from '@/digest/claude-digest.service';
import { DigestService } from '@/digest/digest.service';
import { DigestPublisher } from '@/digest/digest-publisher';
import { DigestStore } from '@/digest/digest-store';
import { InstagramCollectorService } from '@/instagram/instagram-collector.service';
import { TelegramModule } from '@/telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  providers: [InstagramCollectorService, NewsCollectorService, ClaudeDigestService, DigestStore, DigestPublisher, DigestService],
  exports: [DigestService, DigestStore],
})
export class DigestModule {}

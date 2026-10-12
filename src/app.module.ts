import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { NewsCollectorService } from '@/collector/news-collector.service';
import { ClaudeDigestService } from '@/digest/claude-digest.service';
import { DigestService } from '@/digest/digest.service';
import { InstagramCollectorService } from '@/instagram/instagram-collector.service';
import { DigestScheduler } from '@/scheduler/digest.scheduler';
import { TelegramService } from '@/telegram/telegram.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [InstagramCollectorService, NewsCollectorService, ClaudeDigestService, TelegramService, DigestService, DigestScheduler],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { BotModule } from '@/bot/bot.module';
import { DigestModule } from '@/digest/digest.module';
import { DigestScheduler } from '@/scheduler/digest.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), DigestModule, BotModule],
  providers: [DigestScheduler],
})
export class AppModule {}

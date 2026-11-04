import { Module } from '@nestjs/common';

import { AssistantModule } from '@/assistant/assistant.module';
import { BotService } from '@/bot/bot.service';
import { UpdatePollerService } from '@/bot/update-poller.service';
import { TelegramModule } from '@/telegram/telegram.module';

@Module({
  imports: [TelegramModule, AssistantModule],
  providers: [BotService, UpdatePollerService],
})
export class BotModule {}

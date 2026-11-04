import { Module } from '@nestjs/common';

import { AssistantModule } from '@/assistant/assistant.module';
import { BotService } from '@/bot/bot.service';
import { ReviewDesk } from '@/bot/review-desk.service';
import { UpdatePollerService } from '@/bot/update-poller.service';
import { OwnReelService } from '@/instagram/own-reel.service';
import { TelegramModule } from '@/telegram/telegram.module';

@Module({
  imports: [TelegramModule, AssistantModule],
  providers: [BotService, UpdatePollerService, OwnReelService, ReviewDesk],
})
export class BotModule {}

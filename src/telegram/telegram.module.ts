import { Module } from '@nestjs/common';

import { TelegramService } from '@/telegram/telegram.service';
import { TelegramApiService } from '@/telegram/telegram-api.service';

@Module({
  providers: [TelegramApiService, TelegramService],
  exports: [TelegramApiService, TelegramService],
})
export class TelegramModule {}

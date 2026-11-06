import { Module } from '@nestjs/common';

import { AssistantModule } from '@/assistant/assistant.module';
import { OwnReelService } from '@/instagram/own-reel.service';
import { WinnersBuilder } from '@/winners/winners-builder.service';

@Module({
  imports: [AssistantModule],
  providers: [WinnersBuilder, OwnReelService],
})
export class WinnersModule {}

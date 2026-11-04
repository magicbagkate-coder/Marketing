import { Module } from '@nestjs/common';

import { AssistantService } from '@/assistant/assistant.service';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { ReelTalkService } from '@/assistant/reel-talk.service';
import { VideoReviewService } from '@/assistant/video-review.service';
import { DigestModule } from '@/digest/digest.module';

@Module({
  imports: [DigestModule],
  providers: [KnowledgeService, ClaudeChatService, AssistantService, VideoReviewService, ReelTalkService],
  exports: [AssistantService, VideoReviewService, ReelTalkService, KnowledgeService],
})
export class AssistantModule {}

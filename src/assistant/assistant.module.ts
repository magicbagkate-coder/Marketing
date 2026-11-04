import { Module } from '@nestjs/common';

import { AssistantService } from '@/assistant/assistant.service';
import { ClaudeChatService } from '@/assistant/claude-chat.service';
import { KnowledgeService } from '@/assistant/knowledge.service';
import { VideoReviewService } from '@/assistant/video-review.service';
import { DigestModule } from '@/digest/digest.module';

@Module({
  imports: [DigestModule],
  providers: [KnowledgeService, ClaudeChatService, AssistantService, VideoReviewService],
  exports: [AssistantService, VideoReviewService, KnowledgeService],
})
export class AssistantModule {}

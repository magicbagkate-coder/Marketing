import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { KnowledgeBundle } from '@/assistant/knowledge-reader';

import { readKnowledge } from '@/assistant/knowledge-reader';
import { envConfig } from '@/config/env.config';

/** Holds the knowledge base (audience portrait, checklists, course texts) read from the knowledge folder. */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private bundle: KnowledgeBundle = { text: '', files: 0, truncated: false };

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  get(): KnowledgeBundle {
    return this.bundle;
  }

  async reload(): Promise<KnowledgeBundle> {
    this.bundle = await readKnowledge(envConfig.knowledgeDir);
    this.logger.log(`Knowledge base: ${this.bundle.files} files, ${this.bundle.text.length} characters`);
    if (this.bundle.truncated) this.logger.warn('Knowledge base is over the size limit, the last files were skipped');
    return this.bundle;
  }
}

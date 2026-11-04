import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { KnowledgeBundle, KnowledgeScope } from '@/assistant/knowledge-reader';

import { knowledgeText, readKnowledge } from '@/assistant/knowledge-reader';
import { envConfig } from '@/config/env.config';

/** Holds the knowledge base (audience portrait, checklists, course texts) read from the knowledge folder. */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private bundle: KnowledgeBundle = { sections: [], files: 0, truncated: false };

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** The part of the knowledge base meant for this kind of task. */
  textFor(scope: KnowledgeScope): string {
    return knowledgeText(this.bundle, scope);
  }

  async reload(): Promise<KnowledgeBundle> {
    this.bundle = await readKnowledge(envConfig.knowledgeDir);
    this.logger.log(`Knowledge base: ${this.bundle.files} files, review ${this.textFor('review').length} / creative ${this.textFor('creative').length} characters`);
    if (this.bundle.truncated) this.logger.warn('Knowledge base is over the size limit, the last files were skipped');
    return this.bundle;
  }
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';

import { envConfig } from '@/config/env.config';
import { toPlainText } from '@/telegram/plain-text';

const FILE_NAME = 'last-digest.txt';

/** Remembers the latest morning digest so the assistant can build ideas on today's trends. */
@Injectable()
export class DigestStore {
  private readonly logger = new Logger(DigestStore.name);

  async save(text: string): Promise<void> {
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' });
    try {
      await mkdir(envConfig.stateDir, { recursive: true });
      await writeFile(join(envConfig.stateDir, FILE_NAME), `Сводка от ${date}\n${toPlainText(text)}`, 'utf8');
    } catch (error) {
      this.logger.warn(`Could not save the digest for the assistant: ${String(error)}`);
    }
  }

  async load(): Promise<string> {
    try {
      return await readFile(join(envConfig.stateDir, FILE_NAME), 'utf8');
    } catch {
      return '';
    }
  }
}

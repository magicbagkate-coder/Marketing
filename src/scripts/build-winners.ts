import { argv, stdout } from 'node:process';
import { NestFactory } from '@nestjs/core';

import { WinnersModule } from '@/winners/winners.module';
import { WinnersBuilder } from '@/winners/winners-builder.service';

/**
 * Builds the library of winning reels: `node dist/scripts/build-winners.js [--patterns]`.
 * Reads state/winners/list.txt (and videos in state/winners/videos), writes knowledge/winners/*.md.
 * Reels that already have a card are not analysed again.
 */
async function buildLibrary(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WinnersModule);
  try {
    const report = await app.get(WinnersBuilder).build({ forcePatterns: argv.includes('--patterns') });
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void buildLibrary();

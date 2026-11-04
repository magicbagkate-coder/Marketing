import { NestFactory } from '@nestjs/core';

import { DigestModule } from '@/digest/digest.module';
import { DigestService } from '@/digest/digest.service';

/** Manual run: `node dist/scripts/refresh-trends.js` rebuilds the digest and saves it for the assistant, without posting to the group. */
async function refreshTrendsNow(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DigestModule);
  try {
    await app.get(DigestService).refreshTrends();
  } finally {
    await app.close();
  }
}

void refreshTrendsNow();

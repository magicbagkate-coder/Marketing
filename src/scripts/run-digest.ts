import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';
import { DigestService } from '@/digest/digest.service';

/** Manual run: `node dist/scripts/run-digest.js` builds and sends the digest right now. */
async function runDigestNow(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    await app.get(DigestService).runDigest();
  } finally {
    await app.close();
  }
}

void runDigestNow();

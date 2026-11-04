import { NestFactory } from '@nestjs/core';

import { DigestModule } from '@/digest/digest.module';
import { DigestService } from '@/digest/digest.service';

/** Manual run: `node dist/scripts/run-digest.js` builds and sends the digest right now (does not start the assistant). */
async function runDigestNow(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DigestModule);
  try {
    await app.get(DigestService).runDigest();
  } finally {
    await app.close();
  }
}

void runDigestNow();

import { readFile } from 'node:fs/promises';
import { argv, stdout } from 'node:process';
import { NestFactory } from '@nestjs/core';

import { AssistantModule } from '@/assistant/assistant.module';
import { VideoReviewService } from '@/assistant/video-review.service';

/** Manual check: `node dist/scripts/review-video.js <video-or-image-file> [caption]` prints the review of a local file. */
async function reviewLocalFile(): Promise<void> {
  const [, , filePath, caption = ''] = argv;
  if (!filePath) throw new Error('Usage: node dist/scripts/review-video.js <video-or-image-file> [caption]');
  const app = await NestFactory.createApplicationContext(AssistantModule);
  try {
    const kind = /\.(jpe?g|png)$/i.test(filePath) ? 'photo' : 'video';
    const result = await app.get(VideoReviewService).review({ media: await readFile(filePath), kind, caption });
    stdout.write(`${result.answer}\n`);
  } finally {
    await app.close();
  }
}

void reviewLocalFile();

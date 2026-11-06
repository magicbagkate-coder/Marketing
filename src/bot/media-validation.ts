import type { MediaRef } from '@/bot/command-parser';

import { IMAGE_TOO_BIG_TEXT, NEED_MEDIA_TEXT, NEED_PICTURES_TEXT, VIDEO_TOO_BIG_TEXT, VIDEO_TOO_LONG_TEXT } from '@/bot/bot.texts';
import { MAX_DOWNLOAD_BYTES } from '@/telegram/telegram.constants';

const MAX_VIDEO_SECONDS = 120;

/** What is wrong with the video the employee sent, or undefined if it can be reviewed. */
export function validateMedia(media: MediaRef | undefined): string | undefined {
  if (!media) return NEED_MEDIA_TEXT;
  if (media.sizeBytes > MAX_DOWNLOAD_BYTES) return VIDEO_TOO_BIG_TEXT;
  return media.durationSec > MAX_VIDEO_SECONDS ? VIDEO_TOO_LONG_TEXT : undefined;
}

/** What is wrong with the pictures the employee sent, or undefined if Telegram lets the bot download them all. */
export function validateLooks(looks: MediaRef[]): string | undefined {
  if (looks.length === 0) return NEED_PICTURES_TEXT;
  return looks.some((look) => look.sizeBytes > MAX_DOWNLOAD_BYTES) ? IMAGE_TOO_BIG_TEXT : undefined;
}

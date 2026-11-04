import type { VideoInfo } from '@/media/ffmpeg';
import type Anthropic from '@anthropic-ai/sdk';

import {
  FAILED_AUDIO_NOTE,
  NO_AUDIO_NOTE,
  NO_KEY_NOTE,
  PUBLISHED_REVIEW_INSTRUCTION,
  REVIEW_INSTRUCTION,
  REVIEW_PHOTO_INTRO,
  SILENT_AUDIO_NOTE,
} from '@/assistant/assistant.texts';

export type TranscriptStatus = 'ok' | 'no-audio' | 'no-key' | 'failed' | 'silent';

export type Transcript = {
  status: TranscriptStatus;
  text: string;
};

export type Frame = {
  second: number;
  base64: string;
};

export type ReviewMaterial = {
  info: VideoInfo;
  frames: Frame[];
  transcript: Transcript;
  caption: string;
  /** Facts about an already published reel (account, date, likes, caption); replaces the employee caption. */
  published?: string;
};

const TRANSCRIPT_NOTES: { [status: string]: string } = {
  'no-audio': NO_AUDIO_NOTE,
  'no-key': NO_KEY_NOTE,
  failed: FAILED_AUDIO_NOTE,
  silent: SILENT_AUDIO_NOTE,
};

const textBlock = (text: string): Anthropic.TextBlockParam => ({ type: 'text', text });

const imageBlock = (base64: string): Anthropic.ImageBlockParam => ({
  type: 'image',
  source: { type: 'base64', media_type: 'image/jpeg', 'data': base64 },
});

const describeFormat = (info: VideoInfo): string => {
  const orientation = info.height >= info.width ? 'вертикальное' : 'горизонтальное';
  return `Длительность ${info.durationSec.toFixed(1)} с, кадр ${info.width}×${info.height} (${orientation}).`;
};

const describeTranscript = (transcript: Transcript): string =>
  transcript.status === 'ok' ? `Расшифровка озвучки:\n${transcript.text}` : (TRANSCRIPT_NOTES[transcript.status] ?? '');

const describeCaption = (caption: string): string => (caption ? `Подпись сотрудника: ${caption}` : 'Подписи от сотрудника нет.');

/** A published reel: Instagram facts plus whatever numbers or remarks the employee added (reach, views, sales). */
const describePublishedContext = (published: string, notes: string): string =>
  notes ? `${published}\nДописал сотрудник (цифры отсюда достоверны, учти их при оценке): ${notes}` : published;

/** Everything Claude gets for a video review: facts, caption, speech, frames with time marks, and the answer format. */
export function buildReviewContent(material: ReviewMaterial): Anthropic.ContentBlockParam[] {
  const context = material.published ? describePublishedContext(material.published, material.caption) : describeCaption(material.caption);
  const intro = [describeFormat(material.info), context, describeTranscript(material.transcript)];
  const frames = material.frames.flatMap((frame) => [textBlock(`Кадр на ${frame.second} с:`), imageBlock(frame.base64)]);
  const instruction = material.published ? PUBLISHED_REVIEW_INSTRUCTION : REVIEW_INSTRUCTION;
  return [textBlock(intro.join('\n')), textBlock('Кадры ролика по времени:'), ...frames, textBlock(instruction)];
}

/** Review of a single picture (cover or still), no sound. */
export function buildPhotoContent(base64: string, caption: string): Anthropic.ContentBlockParam[] {
  return [textBlock(`${REVIEW_PHOTO_INTRO}\n${describeCaption(caption)}`), imageBlock(base64), textBlock(REVIEW_INSTRUCTION)];
}

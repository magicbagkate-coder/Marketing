import { readFile } from 'node:fs/promises';

import { envConfig } from '@/config/env.config';

const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIBE_TIMEOUT_MS = 120_000;

/** Speech to text through the OpenAI transcription API. The error never contains the key. */
export async function transcribeAudio(filePath: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([await readFile(filePath)], { type: 'audio/mpeg' }), 'audio.mp3');
  form.append('model', envConfig.transcriptionModel);
  form.append('response_format', 'text');
  const response = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${envConfig.openaiApiKey}` },
    body: form,
    signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Transcription failed with status ${response.status}`);
  return (await response.text()).trim();
}

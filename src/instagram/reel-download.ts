import { MAX_REEL_BYTES, REEL_DOWNLOAD_TIMEOUT_MS } from '@/instagram/instagram.constants';

const isTooBig = (bytes: number): boolean => bytes > MAX_REEL_BYTES;

/** Downloads a reel from the Instagram CDN address Graph API gave us; returns undefined when the file is too big. */
export async function downloadReel(url: string): Promise<Buffer | undefined> {
  if (!url.startsWith('https://')) throw new Error('Reel address is not https');
  const response = await fetch(url, { signal: AbortSignal.timeout(REEL_DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Reel download failed: ${response.status}`);
  if (isTooBig(Number(response.headers.get('content-length')))) return undefined;
  const buffer = Buffer.from(await response.arrayBuffer());
  return isTooBig(buffer.length) ? undefined : buffer;
}

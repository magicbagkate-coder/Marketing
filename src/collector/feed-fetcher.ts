import { FEED_REQUEST_TIMEOUT_MS, FEED_USER_AGENT } from '@/collector/collector.constants';

export async function fetchFeed(feedUrl: string): Promise<string> {
  const response = await fetch(feedUrl, {
    headers: { 'user-agent': FEED_USER_AGENT },
    signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`);
  return response.text();
}

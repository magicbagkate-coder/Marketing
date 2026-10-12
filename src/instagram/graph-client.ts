import { GRAPH_API_URL, GRAPH_TIMEOUT_MS } from '@/instagram/instagram.constants';

type GraphParams = { [key: string]: string };
type GraphErrorBody = { error?: { message?: string } };

/** Calls the Meta Graph API; the thrown error never contains the URL, so tokens stay out of logs. */
export async function callGraph(path: string, params: GraphParams): Promise<unknown> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${GRAPH_API_URL}/${path}?${query}`, { signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS) });
  const body: unknown = await response.json();
  if (response.ok) return body;
  const message = (body as GraphErrorBody).error?.message ?? 'unknown error';
  throw new Error(`Graph API ${response.status}: ${message}`);
}

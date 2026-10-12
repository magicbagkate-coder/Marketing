import type { NewsItem } from '@/sources/source.types';

import { DIGEST_INPUT_INTRO, FAILED_SOURCES_PREFIX, PLAIN_DIGEST_TITLE } from '@/digest/digest.texts';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatItemForPrompt(item: NewsItem): string {
  const summary = item.summary ? ` — ${item.summary}` : '';
  return `[${item.source}] ${item.title}${summary} (${item.link})`;
}

export function buildPromptInput(items: NewsItem[]): string {
  return [DIGEST_INPUT_INTRO, ...items.map(formatItemForPrompt)].join('\n');
}

/** Fallback digest without retelling: a plain list of headlines with links, used when Claude is unavailable. */
export function buildPlainDigest(items: NewsItem[]): string {
  const lines = items.map((item) => `• <b>${escapeHtml(item.source)}</b>: <a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a>`);
  return [`<b>${PLAIN_DIGEST_TITLE}</b>`, ...lines].join('\n');
}

export function buildFailedSourcesLine(failedSources: string[]): string {
  return failedSources.length === 0 ? '' : `${FAILED_SOURCES_PREFIX}${failedSources.join(', ')}`;
}

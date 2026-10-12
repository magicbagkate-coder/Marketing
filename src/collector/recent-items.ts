import type { NewsItem } from '@/sources/source.types';

import { HOUR_MS } from '@/collector/collector.constants';

type SelectOptions = {
  now: Date;
  hours: number;
  perSource: number;
};

function uniqueByLink(items: NewsItem[]): NewsItem[] {
  return [...new Map(items.map((item) => [item.link, item])).values()];
}

function limitPerSource(items: NewsItem[], limit: number): NewsItem[] {
  const counts = new Map<string, number>();
  return items.filter((item) => {
    const count = counts.get(item.source) ?? 0;
    counts.set(item.source, count + 1);
    return count < limit;
  });
}

/** Keeps items published within the last `hours`, drops duplicate links, newest first, capped per source. */
export function selectRecentItems(items: NewsItem[], options: SelectOptions): NewsItem[] {
  const cutoff = options.now.getTime() - options.hours * HOUR_MS;
  const recent = items.filter((item) => item.publishedAt.getTime() >= cutoff);
  const sorted = uniqueByLink(recent).sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime());
  return limitPerSource(sorted, options.perSource);
}

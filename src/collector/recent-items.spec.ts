import type { NewsItem } from '@/sources/source.types';

import { selectRecentItems } from '@/collector/recent-items';

const NOW = new Date('2026-10-12T08:00:00Z');

function makeItem(source: string, link: string, hoursAgo: number): NewsItem {
  const publishedAt = new Date(NOW.getTime() - hoursAgo * 3_600_000);
  return { source, title: `Title ${link}`, link, summary: '', publishedAt };
}

describe('selectRecentItems', () => {
  const options = { now: NOW, hours: 24, perSource: 2 };

  it('drops items older than the window', () => {
    const items = [makeItem('A', 'a1', 2), makeItem('A', 'a2', 30)];
    expect(selectRecentItems(items, options).map((item) => item.link)).toEqual(['a1']);
  });

  it('removes duplicate links and sorts newest first', () => {
    const items = [makeItem('A', 'same', 10), makeItem('B', 'same', 10), makeItem('B', 'b1', 1)];
    expect(selectRecentItems(items, options).map((item) => item.link)).toEqual(['b1', 'same']);
  });

  it('keeps at most the limit per source', () => {
    const items = [makeItem('A', 'a1', 1), makeItem('A', 'a2', 2), makeItem('A', 'a3', 3), makeItem('B', 'b1', 4)];
    expect(selectRecentItems(items, options).map((item) => item.link)).toEqual(['a1', 'a2', 'b1']);
  });
});

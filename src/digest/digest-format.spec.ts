import type { NewsItem } from '@/sources/source.types';

import { buildPlainDigest } from '@/digest/digest-format';

const ITEM: NewsItem = {
  source: 'Vogue & Co',
  title: 'Bag <new> drop',
  link: 'https://example.com/a?x=1&y=2',
  summary: '',
  publishedAt: new Date('2026-10-27T05:00:00Z'),
};

describe('buildPlainDigest', () => {
  it('puts the notice first and escapes html in headlines and links', () => {
    const lines = buildPlainDigest([ITEM], 'NOTICE').split('\n');
    expect(lines[0]).toBe('NOTICE');
    expect(lines[2]).toBe('• <b>Vogue &amp; Co</b>: <a href="https://example.com/a?x=1&amp;y=2">Bag &lt;new&gt; drop</a>');
  });
});

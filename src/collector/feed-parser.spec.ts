import { parseFeed } from '@/collector/feed-parser';

const RSS_SAMPLE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>New &lt;b&gt;Bag&lt;/b&gt; drop</title>
    <link>https://example.com/bag</link>
    <description><![CDATA[<p>A <b>mini</b> bag&nbsp;for fall.</p>]]></description>
    <pubDate>Mon, 12 Oct 2026 07:00:00 +0000</pubDate>
  </item>
  <item>
    <title>No date item</title>
    <link>https://example.com/nodate</link>
  </item>
</channel></rss>`;

const ATOM_SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom story</title>
    <link href="https://example.com/atom" rel="alternate"/>
    <summary>Short summary</summary>
    <updated>2026-10-12T06:00:00Z</updated>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('reads RSS items, strips html and skips items without a date', () => {
    const items = parseFeed(RSS_SAMPLE, 'Test RSS');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: 'Test RSS',
      title: 'New Bag drop',
      link: 'https://example.com/bag',
      summary: 'A mini bag for fall.',
    });
    expect(items[0].publishedAt.toISOString()).toBe('2026-10-12T07:00:00.000Z');
  });

  it('reads Atom entries with href links', () => {
    const items = parseFeed(ATOM_SAMPLE, 'Test Atom');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Atom story', link: 'https://example.com/atom', summary: 'Short summary' });
  });

  it('returns an empty list for a page that is not a feed', () => {
    expect(parseFeed('<html><body>hello</body></html>', 'Broken')).toEqual([]);
  });
});

import { parsePosts } from '@/instagram/instagram-posts';

const RESPONSE = {
  business_discovery: {
    media: {
      'data': [
        { caption: 'New Celine bag\nSecond line of the post', permalink: 'https://instagram.com/p/1', timestamp: '2026-10-12T09:25:16+0000' },
        { permalink: 'https://instagram.com/p/2', timestamp: '2026-10-12T09:00:00+0000' },
        { caption: 'Bad date', permalink: 'https://instagram.com/p/3', timestamp: 'not-a-date' },
      ],
    },
  },
};

describe('parsePosts', () => {
  it('keeps posts with caption, link and valid date', () => {
    const items = parsePosts(RESPONSE, 'vogueitalia');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: 'Instagram @vogueitalia', title: 'New Celine bag', link: 'https://instagram.com/p/1' });
    expect(items[0].summary).toBe('New Celine bag Second line of the post');
    expect(items[0].publishedAt.toISOString()).toBe('2026-10-12T09:25:16.000Z');
  });

  it('returns an empty list when the response has no posts', () => {
    expect(parsePosts({}, 'wwd')).toEqual([]);
  });
});

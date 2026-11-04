import { parsePage, toOwnPost } from '@/instagram/own-posts';

describe('parsePage', () => {
  it('returns posts and the next cursor', () => {
    const page = parsePage({
      business_discovery: { media: { 'data': [{ permalink: 'https://www.instagram.com/reel/A1/' }], paging: { cursors: { after: 'CUR' } } } },
    });
    expect(page.posts).toHaveLength(1);
    expect(page.next).toBe('CUR');
  });

  it('returns an empty page for an unexpected response', () => {
    expect(parsePage({})).toEqual({ posts: [], next: undefined });
  });
});

describe('toOwnPost', () => {
  it('fills missing fields with empty values', () => {
    expect(toOwnPost({}, 'magicbagukraine')).toEqual({
      username: 'magicbagukraine',
      mediaType: '',
      mediaUrl: '',
      caption: '',
      likes: 0,
      comments: 0,
      publishedAt: '',
    });
  });
});

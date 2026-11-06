import { callGraph } from '@/instagram/graph-client';
import { findOwnPosts } from '@/instagram/own-posts';

jest.mock('@/instagram/graph-client', () => ({ callGraph: jest.fn() }));

const mockGraph = callGraph as jest.Mock;
const post = (code: string, likes: number): object => ({
  media_type: 'VIDEO',
  media_url: `https://cdn/${code}.mp4`,
  permalink: `https://www.instagram.com/reel/${code}/`,
  like_count: likes,
});
const page = (posts: object[], next?: string): object => ({ business_discovery: { media: { 'data': posts, paging: { cursors: { after: next } } } } });
const search = { businessId: 'b', token: 't', maxPages: 10 };

describe('findOwnPosts', () => {
  beforeEach(() => mockGraph.mockReset());

  it('finds several reels deep in the history with one pass and stops when all are found', async () => {
    mockGraph
      .mockResolvedValueOnce(page([post('AAA', 1), post('BBB', 2)], 'c1'))
      .mockResolvedValueOnce(page([post('CCC', 3), post('DDD', 4)], 'c2'))
      .mockResolvedValueOnce(page([post('EEE', 5)]));
    const result = await findOwnPosts({ ...search, codes: ['BBB', 'DDD'] });
    expect([...result.posts.keys()].sort()).toEqual(['BBB', 'DDD']);
    expect(result.posts.get('DDD')).toMatchObject({ username: 'magicbagukraine', likes: 4 });
    expect(result.problem).toBeUndefined();
    expect(mockGraph).toHaveBeenCalledTimes(2);
  });

  it('goes on to the second account for the reels that the first one does not have', async () => {
    mockGraph.mockResolvedValueOnce(page([post('AAA', 1)])).mockResolvedValueOnce(page([post('ZZZ', 9)]));
    const result = await findOwnPosts({ ...search, codes: ['ZZZ'] });
    expect(result.posts.get('ZZZ')).toMatchObject({ username: 'magicbag_ua' });
  });

  it('keeps what it found and tells why it stopped when Instagram refuses', async () => {
    mockGraph.mockResolvedValueOnce(page([post('AAA', 1)], 'c1')).mockRejectedValueOnce(new Error('request limit'));
    const result = await findOwnPosts({ ...search, codes: ['AAA', 'BBB'] });
    expect([...result.posts.keys()]).toEqual(['AAA']);
    expect(result.problem).toContain('request limit');
  });
});

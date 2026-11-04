import { baselineOf, median } from '@/instagram/baseline';

const video = (permalink: string, likes: number, comments: number) => ({
  media_type: 'VIDEO',
  permalink,
  like_count: likes,
  comments_count: comments,
});

describe('median', () => {
  it('handles empty, odd and even lists', () => {
    expect(median([])).toBe(0);
    expect(median([5, 1, 9])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe('baselineOf', () => {
  it('takes the median of videos and skips the reviewed reel and non-videos', () => {
    const posts = [
      video('a', 10, 1),
      video('b', 30, 3),
      video('c', 20, 2),
      video('me', 500, 50),
      { media_type: 'CAROUSEL_ALBUM', permalink: 'x', like_count: 999, comments_count: 99 },
    ];
    expect(baselineOf(posts, 'me')).toEqual({ reels: 3, likes: 20, comments: 2 });
  });

  it('returns zeros when there is nothing to compare with', () => {
    expect(baselineOf([], undefined)).toEqual({ reels: 0, likes: 0, comments: 0 });
  });
});

export type Baseline = {
  reels: number;
  likes: number;
  comments: number;
};

export type BaselinePost = {
  media_type?: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
};

export const EMPTY_BASELINE: Baseline = { reels: 0, likes: 0, comments: 0 };
const BASELINE_SIZE = 30;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Typical results of the account: the median likes and comments of its latest videos, without the reel being reviewed. */
export function baselineOf(posts: BaselinePost[], skipPermalink: string | undefined): Baseline {
  const videos = posts.filter((post) => post.media_type === 'VIDEO' && post.permalink !== skipPermalink).slice(0, BASELINE_SIZE);
  return {
    reels: videos.length,
    likes: median(videos.map((post) => post.like_count ?? 0)),
    comments: median(videos.map((post) => post.comments_count ?? 0)),
  };
}

import type { Baseline } from '@/instagram/baseline';

import { baselineOf, EMPTY_BASELINE } from '@/instagram/baseline';
import { callGraph } from '@/instagram/graph-client';
import { OWN_ACCOUNTS, OWN_MAX_PAGES, OWN_POSTS_PER_PAGE } from '@/instagram/instagram.constants';
import { findReelCode } from '@/instagram/reel-link';

export type OwnPost = {
  username: string;
  mediaType: string;
  mediaUrl: string;
  caption: string;
  likes: number;
  comments: number;
  publishedAt: string;
  /** Typical results of the account, to tell whether this reel did better or worse than usual. */
  baseline: Baseline;
};

type RawPost = {
  media_type?: string;
  media_url?: string;
  permalink?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
};

type DiscoveryMedia = { 'data'?: RawPost[]; paging?: { cursors?: { after?: string } } };
type DiscoveryPage = { business_discovery?: { media?: DiscoveryMedia } };
type PageResult = { posts: RawPost[]; next?: string };

export type PostProblem = 'not-found' | 'not-video' | 'no-file';

export type SearchOptions = {
  businessId: string;
  token: string;
  code: string;
};

const POST_FIELDS = 'media_type,media_url,permalink,caption,like_count,comments_count,timestamp';

const buildQuery = (username: string, after: string | undefined): string => {
  const paging = after ? `.after(${after})` : '';
  return `business_discovery.username(${username}){media.limit(${OWN_POSTS_PER_PAGE})${paging}{${POST_FIELDS}}}`;
};

const orEmpty = (value: string | undefined): string => value ?? '';
const orZero = (value: number | undefined): number => value ?? 0;
const cursorOf = (media: DiscoveryMedia | undefined): string | undefined => media?.paging?.cursors?.after;
const mediaOf = (response: unknown): DiscoveryMedia | undefined => (response as DiscoveryPage).business_discovery?.media;

/** Reads one page of an account's posts, newest first, from a Business Discovery response. */
export function parsePage(response: unknown): PageResult {
  const media = mediaOf(response);
  return { posts: media?.data ?? [], next: cursorOf(media) };
}

export function toOwnPost(raw: RawPost, username: string): OwnPost {
  return {
    username,
    mediaType: orEmpty(raw.media_type),
    mediaUrl: orEmpty(raw.media_url),
    caption: orEmpty(raw.caption),
    likes: orZero(raw.like_count),
    comments: orZero(raw.comments_count),
    publishedAt: orEmpty(raw.timestamp),
    baseline: EMPTY_BASELINE,
  };
}

async function searchAccount(username: string, options: SearchOptions): Promise<OwnPost | undefined> {
  const seen: RawPost[] = [];
  let after: string | undefined;
  for (let page = 0; page < OWN_MAX_PAGES; page += 1) {
    const response = await callGraph(options.businessId, { fields: buildQuery(username, after), access_token: options.token });
    const result = parsePage(response);
    seen.push(...result.posts);
    const found = result.posts.find((post) => post.permalink && findReelCode(post.permalink) === options.code);
    if (found) return { ...toOwnPost(found, username), baseline: baselineOf(seen, found.permalink) };
    if (!result.next || result.posts.length === 0) return undefined;
    after = result.next;
  }
  return undefined;
}

/** Looks for a post by its short code in the latest posts of our own accounts. */
export async function findOwnPost(options: SearchOptions): Promise<OwnPost | undefined> {
  for (const username of OWN_ACCOUNTS) {
    const post = await searchAccount(username, options);
    if (post) return post;
  }
  return undefined;
}

/** What stops a post from being reviewed as a reel: it is not a video, or Instagram gives no file. */
export function videoProblem(post: OwnPost): PostProblem | undefined {
  if (post.mediaType !== 'VIDEO') return 'not-video';
  return post.mediaUrl ? undefined : 'no-file';
}

/** Finds our own post by code and checks that it is a video with a downloadable file. */
export async function findVideoPost(options: SearchOptions): Promise<OwnPost | PostProblem> {
  const post = await findOwnPost(options);
  return post ? (videoProblem(post) ?? post) : 'not-found';
}

export type BulkSearch = {
  businessId: string;
  token: string;
  codes: string[];
  maxPages: number;
};

export type BulkResult = {
  posts: Map<string, OwnPost>;
  /** Why the search stopped early (for example Instagram's request limit); the posts found before that are still returned. */
  problem?: string;
};

type Pending = { wanted: Set<string>; found: Map<string, OwnPost> };

function takeIfWanted(raw: RawPost, username: string, pending: Pending): void {
  const code = raw.permalink ? findReelCode(raw.permalink) : undefined;
  if (!code || !pending.wanted.delete(code)) return;
  pending.found.set(code, toOwnPost(raw, username));
}

const nextCursor = (result: PageResult): string | undefined => (result.posts.length > 0 ? result.next : undefined);

async function scanAccount(username: string, search: BulkSearch, pending: Pending): Promise<void> {
  let after: string | undefined;
  for (let page = 0; page < search.maxPages && pending.wanted.size > 0; page += 1) {
    const result = parsePage(await callGraph(search.businessId, { fields: buildQuery(username, after), access_token: search.token }));
    for (const raw of result.posts) takeIfWanted(raw, username, pending);
    after = nextCursor(result);
    if (!after) return;
  }
}

/** Looks for many posts at once: each page of each account is read one time, however many codes are wanted. */
export async function findOwnPosts(search: BulkSearch): Promise<BulkResult> {
  const pending: Pending = { wanted: new Set(search.codes), found: new Map() };
  try {
    for (const username of OWN_ACCOUNTS) await scanAccount(username, search, pending);
  } catch (error) {
    return { posts: pending.found, problem: String(error) };
  }
  return { posts: pending.found };
}

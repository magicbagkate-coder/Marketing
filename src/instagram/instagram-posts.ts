import type { NewsItem } from '@/sources/source.types';

import { SUMMARY_LIMIT } from '@/collector/collector.constants';
import { callGraph } from '@/instagram/graph-client';
import { CAPTION_TITLE_LIMIT, POSTS_PER_ACCOUNT } from '@/instagram/instagram.constants';

type InstagramMedia = { caption?: string; permalink?: string; timestamp?: string };
type DiscoveryResponse = { business_discovery?: { media?: { 'data'?: InstagramMedia[] } } };

type FetchOptions = {
  businessId: string;
  token: string;
  username: string;
};

function toNewsItem(media: InstagramMedia, username: string): NewsItem | null {
  if (!media.caption || !media.permalink || !media.timestamp) return null;
  const caption = media.caption.replace(/\s+/g, ' ').trim();
  const title = media.caption.split('\n')[0].trim().slice(0, CAPTION_TITLE_LIMIT);
  const summary = caption.length > SUMMARY_LIMIT ? `${caption.slice(0, SUMMARY_LIMIT).trimEnd()}…` : caption;
  return { source: `Instagram @${username}`, title, link: media.permalink, summary, publishedAt: new Date(media.timestamp) };
}

/** Turns a Business Discovery response into news items; posts without a caption are skipped. */
export function parsePosts(response: unknown, username: string): NewsItem[] {
  const posts = (response as DiscoveryResponse).business_discovery?.media?.data ?? [];
  return posts
    .map((media) => toNewsItem(media, username))
    .filter((item): item is NewsItem => item !== null && !Number.isNaN(item.publishedAt.getTime()));
}

/** Reads the latest public posts of another Instagram business/creator account through our own account. */
export async function fetchAccountPosts(options: FetchOptions): Promise<NewsItem[]> {
  const fields = `business_discovery.username(${options.username}){media.limit(${POSTS_PER_ACCOUNT}){caption,permalink,timestamp}}`;
  const response = await callGraph(options.businessId, { fields, access_token: options.token });
  return parsePosts(response, options.username);
}

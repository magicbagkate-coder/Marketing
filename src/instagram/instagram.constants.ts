export const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';
export const GRAPH_TIMEOUT_MS = 30_000;
export const POSTS_PER_ACCOUNT = 10;
export const CAPTION_TITLE_LIMIT = 100;

/** Our own accounts whose reels the assistant can review by link. */
export const OWN_ACCOUNTS: string[] = ['magicbagukraine', 'magicbag_ua'];
export const OWN_POSTS_PER_PAGE = 50;
export const OWN_MAX_PAGES = 6;
/** The library of winning reels goes much deeper: the page publishes about a dozen reels a day, old winners lie hundreds of posts back. */
export const WINNERS_MAX_PAGES = 400;
export const MAX_REEL_BYTES = 100 * 1024 * 1024;
export const REEL_DOWNLOAD_TIMEOUT_MS = 90_000;

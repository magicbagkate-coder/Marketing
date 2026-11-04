const REEL_LINK = /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/i;

const INSTAGRAM_URL = /https?:\/\/\S*instagram\.com\S*/gi;

/** Removes Instagram links from a message so that only the employee's own words (numbers, comments) remain. */
export function stripReelLinks(text: string): string {
  return text.replace(INSTAGRAM_URL, '').replace(/\s+/g, ' ').trim();
}

/** Finds an Instagram post or reel link in the text and returns its short code (the part after /reel/). */
export function findReelCode(text: string): string | undefined {
  return REEL_LINK.exec(text)?.[1];
}

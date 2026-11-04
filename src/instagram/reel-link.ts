const REEL_LINK = /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/i;

/** Finds an Instagram post or reel link in the text and returns its short code (the part after /reel/). */
export function findReelCode(text: string): string | undefined {
  return REEL_LINK.exec(text)?.[1];
}

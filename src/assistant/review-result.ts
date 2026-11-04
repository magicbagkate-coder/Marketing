export type ReviewResult = {
  /** The review shown to the employee. */
  answer: string;
  /** Everything we keep about the video for follow-up questions: facts, speech, short frame log. No pictures. */
  digest: string;
};

/** The closing tag may be missing if the answer was cut short; then the block runs to the end. */
const FRAMES_LOG = /<frames>([\s\S]*?)(?:<\/frames>|$)/i;

/** Claude ends a review with a service block <frames>…</frames>; it is cut out of the answer and kept for follow-ups. */
export function splitFramesLog(raw: string): { answer: string; framesLog: string } {
  const framesLog = FRAMES_LOG.exec(raw)?.[1].trim() ?? '';
  const answer = raw.replace(FRAMES_LOG, '').trim();
  return { answer, framesLog };
}

export function buildDigest(material: string, framesLog: string): string {
  return framesLog ? `${material}\n\nКраткий лог кадров:\n${framesLog}` : material;
}

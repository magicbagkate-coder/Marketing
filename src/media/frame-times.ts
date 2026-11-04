const EARLY_SECONDS = [0, 0.5, 1, 2];
const MIDDLE_START = 3;
const TAIL_MARGIN = 0.2;

const roundTenth = (value: number): number => Math.round(value * 10) / 10;

/**
 * Chooses which moments of a video to look at: the first seconds densely (the hook decides most),
 * then evenly spread frames up to the end.
 */
export function pickFrameTimes(durationSec: number, maxFrames: number): number[] {
  const last = Math.max(durationSec - TAIL_MARGIN, 0);
  const early = EARLY_SECONDS.filter((second) => second < last || second === 0).slice(0, maxFrames);
  const slots = last > MIDDLE_START ? maxFrames - early.length : 0;
  const step = slots > 0 ? (last - MIDDLE_START) / slots : 0;
  const middle = Array.from({ length: Math.max(slots, 0) }, (_, index) => roundTenth(MIDDLE_START + step * (index + 1)));
  return [...early, ...middle];
}

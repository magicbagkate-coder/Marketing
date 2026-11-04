/** Parses a comma separated list of Telegram user ids, ignoring anything that is not a positive integer. */
export function parseIds(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export const TELEGRAM_MESSAGE_LIMIT = 4000;

function cutLongLine(line: string, limit: number): string[] {
  const parts: string[] = [];
  for (let start = 0; start < line.length; start += limit) parts.push(line.slice(start, start + limit));
  return parts;
}

function addLine(chunks: string[], line: string, limit: number): string[] {
  const last = chunks.at(-1);
  if (last !== undefined && last.length + 1 + line.length <= limit) return [...chunks.slice(0, -1), `${last}\n${line}`];
  return [...chunks, line];
}

/** Splits text into chunks not longer than `limit`, breaking on line ends where possible. */
export function splitMessage(text: string, limit: number = TELEGRAM_MESSAGE_LIMIT): string[] {
  return text
    .split('\n')
    .flatMap((part) => cutLongLine(part, limit))
    .reduce<string[]>((chunks, line) => addLine(chunks, line, limit), []);
}

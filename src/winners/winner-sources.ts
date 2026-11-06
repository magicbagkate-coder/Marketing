import { basename, extname } from 'node:path';

import { findReelCode } from '@/instagram/reel-link';

/** One reel of the library: an Instagram link or a video file, with the numbers the owner told us. */
export type WinnerSource = {
  id: string;
  reelCode?: string;
  fileName?: string;
  views?: number;
  note: string;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];
const VIEWS_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(к|k|тыс|м|m|млн)?\.?$/i;
const THOUSANDS = ['к', 'k', 'тыс'];
const THOUSAND = 1000;
const MILLION = 1_000_000;

export const isVideoFile = (name: string): boolean => VIDEO_EXTENSIONS.includes(extname(name).toLowerCase());

function multiplierOf(suffix: string | undefined): number {
  if (!suffix) return 1;
  return THOUSANDS.includes(suffix.toLowerCase()) ? THOUSAND : MILLION;
}

/** Reads «125000», «125 000», «125к», «1,2м» or «1.2 млн» as a number of views. */
export function parseViews(text: string): number | undefined {
  const match = VIEWS_PATTERN.exec(text.replace(/\s+(?=\d{3}\b)/g, '').trim());
  if (!match) return undefined;
  return Math.round(Number(match[1].replace(',', '.')) * multiplierOf(match[2]));
}

const safeId = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');

function toSource(parts: string[]): WinnerSource | undefined {
  const [first, second = '', ...rest] = parts;
  const views = parseViews(second);
  const note = (views === undefined ? [second, ...rest] : rest).join(';').trim();
  const reelCode = findReelCode(first);
  if (reelCode) return { id: reelCode, reelCode, views, note };
  if (!isVideoFile(first)) return undefined;
  return { id: safeId(basename(first, extname(first))), fileName: basename(first), views, note };
}

/**
 * Reads the owner's list: one reel per line, «ссылка или имя файла; просмотры; заметка».
 * Views and the note are optional; empty lines, lines starting with # and unrecognised lines are skipped.
 */
export function parseSourceLines(text: string): WinnerSource[] {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .flatMap((line) => toSource(line.split(';').map((part) => part.trim())) ?? [])
    .filter((source) => !seen.has(source.id) && Boolean(seen.add(source.id)));
}

/** Video files that lie in the folder but are not in the list still go to the library, without numbers. */
export function addFolderFiles(sources: WinnerSource[], fileNames: string[]): WinnerSource[] {
  const known = new Set(sources.map((source) => source.fileName));
  const extra = fileNames
    .filter((name) => isVideoFile(name) && !known.has(name))
    .map((name): WinnerSource => ({ id: safeId(basename(name, extname(name))), fileName: name, note: '' }));
  return [...sources, ...extra];
}

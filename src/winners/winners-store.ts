import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { WinnerCard } from '@/winners/winner-cards';
import type { WinnerSource } from '@/winners/winner-sources';

import { envConfig } from '@/config/env.config';
import { parseCardFile, renderCardFile } from '@/winners/winner-cards';
import { addFolderFiles, parseSourceLines } from '@/winners/winner-sources';

const LIST_FILE = 'list.txt';
const VIDEOS_DIR = 'videos';
const CARDS_DIR = 'cards';
const FAILED_FILE = 'failed.txt';
const LIBRARY_DIR = 'winners';

/** The working folder of the library inside the state folder: the list, the videos, the cards made so far. */
export const winnersDir = (): string => join(envConfig.stateDir, 'winners');
const cardPath = (id: string): string => join(winnersDir(), CARDS_DIR, `${id}.md`);

async function readOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

async function listOrEmpty(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

/** The reels the owner gave: the list file plus the video files lying in the videos folder. */
export async function readSources(): Promise<WinnerSource[]> {
  const listed = parseSourceLines(await readOrEmpty(join(winnersDir(), LIST_FILE)));
  return addFolderFiles(listed, await listOrEmpty(join(winnersDir(), VIDEOS_DIR)));
}

export const readVideoFile = (fileName: string): Promise<Buffer> => readFile(join(winnersDir(), VIDEOS_DIR, fileName));

/** The text of a card made earlier, or undefined if the reel has not been analysed yet. */
export async function loadCardBody(id: string): Promise<string | undefined> {
  const text = await readOrEmpty(cardPath(id));
  return text ? parseCardFile(text).body : undefined;
}

export async function saveCard(card: WinnerCard): Promise<void> {
  await mkdir(join(winnersDir(), CARDS_DIR), { recursive: true });
  await writeFile(cardPath(card.id), renderCardFile(card), 'utf8');
}

export async function saveFailures(lines: string[]): Promise<void> {
  await mkdir(winnersDir(), { recursive: true });
  await writeFile(join(winnersDir(), FAILED_FILE), `${lines.join('\n')}\n`, 'utf8');
}

export const patternsExist = async (): Promise<boolean> => (await readOrEmpty(join(envConfig.knowledgeDir, LIBRARY_DIR, '00-patterns.md'))) !== '';

/** Writes the library into the knowledge folder; the assistant reads it as part of the creative knowledge. */
export async function writeLibrary(files: { patterns?: string; topReels: string }): Promise<void> {
  const dir = join(envConfig.knowledgeDir, LIBRARY_DIR);
  await mkdir(dir, { recursive: true });
  if (files.patterns) await writeFile(join(dir, '00-patterns.md'), files.patterns, 'utf8');
  await writeFile(join(dir, '10-top-reels.md'), files.topReels, 'utf8');
}

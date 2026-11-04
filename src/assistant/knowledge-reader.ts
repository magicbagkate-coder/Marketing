import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/** What the assistant is doing: judging a finished video, or inventing ideas and scripts. */
export type KnowledgeScope = 'review' | 'creative';

export type KnowledgeSection = {
  scopes: KnowledgeScope[];
  text: string;
};

export type KnowledgeBundle = {
  sections: KnowledgeSection[];
  files: number;
  truncated: boolean;
};

export const MAX_KNOWLEDGE_CHARS = 600_000;
const EXTENSIONS = ['.md', '.txt'];
const ALL_SCOPES: KnowledgeScope[] = ['review', 'creative'];

const hasKnowledgeExtension = (name: string): boolean => EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));
const isKnowledgeFile = (name: string): boolean => hasKnowledgeExtension(name) && !name.startsWith('_') && !name.startsWith('.');

/** Files under review/ or creative/ are read only for that task; everything else (shared/, loose files) is read for both. */
export function scopesOf(relativePath: string): KnowledgeScope[] {
  const [folder] = relativePath.split('/');
  if (folder === 'review') return ['review'];
  return folder === 'creative' ? ['creative'] : ALL_SCOPES;
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isKnowledgeFile(entry.name))
      .map((entry) => join(entry.parentPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

/** Joins the sections meant for one task into the text that goes into the system prompt. */
export function knowledgeText(bundle: KnowledgeBundle, scope: KnowledgeScope): string {
  return bundle.sections
    .filter((section) => section.scopes.includes(scope))
    .map((section) => section.text)
    .join('\n\n');
}

/**
 * Reads every .md and .txt file under `dir` (files starting with _ or . are skipped) in alphabetical order.
 * Stops at the size limit.
 */
export async function readKnowledge(dir: string): Promise<KnowledgeBundle> {
  const sections: KnowledgeSection[] = [];
  let total = 0;
  let truncated = false;
  for (const path of await listFiles(dir)) {
    const name = relative(dir, path).replace(/\\/g, '/');
    const text = `## ФАЙЛ: ${name}\n${(await readFile(path, 'utf8')).trim()}`;
    if (total + text.length > MAX_KNOWLEDGE_CHARS) {
      truncated = true;
      break;
    }
    sections.push({ scopes: scopesOf(name), text });
    total += text.length;
  }
  return { sections, files: sections.length, truncated };
}

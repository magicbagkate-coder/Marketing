import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export type KnowledgeBundle = {
  text: string;
  files: number;
  truncated: boolean;
};

export const MAX_KNOWLEDGE_CHARS = 600_000;
const EXTENSIONS = ['.md', '.txt'];

const hasKnowledgeExtension = (name: string): boolean => EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));
const isKnowledgeFile = (name: string): boolean => hasKnowledgeExtension(name) && !name.startsWith('_') && !name.startsWith('.');

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

/**
 * Reads every .md and .txt file under `dir` (files starting with _ or . are skipped) in alphabetical order,
 * so audience/, checklists/ and course/ folders come in that order. Stops at the size limit.
 */
export async function readKnowledge(dir: string): Promise<KnowledgeBundle> {
  const sections: string[] = [];
  let total = 0;
  let truncated = false;
  for (const path of await listFiles(dir)) {
    const body = (await readFile(path, 'utf8')).trim();
    const section = `## ФАЙЛ: ${relative(dir, path).replace(/\\/g, '/')}\n${body}`;
    if (total + section.length > MAX_KNOWLEDGE_CHARS) {
      truncated = true;
      break;
    }
    sections.push(section);
    total += section.length;
  }
  return { text: sections.join('\n\n'), files: sections.length, truncated };
}

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { knowledgeText, readKnowledge, scopesOf } from '@/assistant/knowledge-reader';

describe('readKnowledge', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'knowledge-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads md and txt files in alphabetical order and skips others', async () => {
    await mkdir(join(dir, 'course'));
    await mkdir(join(dir, 'audience'));
    await writeFile(join(dir, 'course', 'lesson1.md'), 'Lesson one');
    await writeFile(join(dir, 'audience', 'portrait.txt'), 'Portrait');
    await writeFile(join(dir, 'course', '_draft.md'), 'hidden');
    await writeFile(join(dir, 'notes.pdf'), 'binary');
    const bundle = await readKnowledge(dir);
    expect(bundle.files).toBe(2);
    const text = knowledgeText(bundle, 'review');
    expect(text.indexOf('audience/portrait.txt')).toBeLessThan(text.indexOf('course/lesson1.md'));
    expect(text).toContain('Portrait');
    expect(text).not.toContain('hidden');
    expect(bundle.truncated).toBe(false);
  });

  it('returns an empty bundle for a missing folder', async () => {
    expect(await readKnowledge(join(dir, 'missing'))).toEqual({ sections: [], files: 0, truncated: false });
  });

  it('gives review and creative folders only to their own task', async () => {
    await mkdir(join(dir, 'review'));
    await mkdir(join(dir, 'creative'));
    await mkdir(join(dir, 'shared'));
    await writeFile(join(dir, 'review', 'a.md'), 'Checklist');
    await writeFile(join(dir, 'creative', 'b.md'), 'Formats');
    await writeFile(join(dir, 'shared', 'c.md'), 'Portrait');
    const bundle = await readKnowledge(dir);
    expect(knowledgeText(bundle, 'review')).toContain('Checklist');
    expect(knowledgeText(bundle, 'review')).not.toContain('Formats');
    expect(knowledgeText(bundle, 'creative')).toContain('Formats');
    expect(knowledgeText(bundle, 'creative')).not.toContain('Checklist');
    expect(knowledgeText(bundle, 'creative')).toContain('Portrait');
  });

  it('gives the winning reels only to ideas and scripts', () => {
    expect(scopesOf('winners/10-top-reels.md')).toEqual(['creative']);
    expect(scopesOf('review/a.md')).toEqual(['review']);
  });

  it('treats loose files as shared', () => {
    expect(scopesOf('notes.md')).toEqual(['review', 'creative']);
  });
});

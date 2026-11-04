import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readKnowledge } from '@/assistant/knowledge-reader';

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
    expect(bundle.text.indexOf('audience/portrait.txt')).toBeLessThan(bundle.text.indexOf('course/lesson1.md'));
    expect(bundle.text).toContain('Portrait');
    expect(bundle.text).not.toContain('hidden');
    expect(bundle.truncated).toBe(false);
  });

  it('returns an empty bundle for a missing folder', async () => {
    expect(await readKnowledge(join(dir, 'missing'))).toEqual({ text: '', files: 0, truncated: false });
  });
});

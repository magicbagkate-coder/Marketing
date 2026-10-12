import { applyEnvValues } from '@/config/env-file';

describe('applyEnvValues', () => {
  it('replaces an existing key and keeps the others', () => {
    const result = applyEnvValues('PORT=7000\nTOKEN=old\n', { TOKEN: 'new' });
    expect(result).toBe('PORT=7000\nTOKEN=new\n');
  });

  it('appends a missing key', () => {
    const result = applyEnvValues('PORT=7000\n', { TOKEN: 'abc' });
    expect(result).toBe('PORT=7000\nTOKEN=abc\n');
  });

  it('keeps comments and blank lines in the middle', () => {
    const result = applyEnvValues('# note\n\nTOKEN=old\n', { TOKEN: 'x' });
    expect(result).toBe('# note\n\nTOKEN=x\n');
  });
});

import { buildSystemBlocks, buildTaskPrompt } from '@/assistant/assistant-prompts';

describe('buildSystemBlocks', () => {
  it('marks a non-empty knowledge base for caching', () => {
    const blocks = buildSystemBlocks('Portrait of the client');
    expect(blocks).toHaveLength(2);
    expect(blocks[1].text).toContain('Portrait of the client');
    expect(blocks[1].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('says plainly that the knowledge base is empty', () => {
    const blocks = buildSystemBlocks('');
    expect(blocks[1].text).toContain('пуста');
    expect(blocks[1].cache_control).toBeUndefined();
  });
});

describe('buildTaskPrompt', () => {
  it('falls back to a default request for ideas and adds the context', () => {
    const prompt = buildTaskPrompt({ kind: 'ideas', text: '', replyContext: 'reply text', trends: 'trend text' });
    expect(prompt).toContain('5 идей');
    expect(prompt).toContain('reply text');
    expect(prompt).toContain('trend text');
  });

  it('makes the script rely on the winning reels and ask for second-by-second timing', () => {
    const prompt = buildTaskPrompt({ kind: 'script', text: '', replyContext: '', trends: '' });
    expect(prompt).toContain('рилсы-победители');
    expect(prompt).toContain('посекундно');
    expect(prompt).toContain('Озвучка');
  });

  it('asks for a human screenwriter voice and bans advertising clichés', () => {
    const prompt = buildTaskPrompt({ kind: 'script', text: '', replyContext: '', trends: '' });
    expect(prompt).toContain('сильный живой сценарист');
    expect(prompt).toContain('Запрещены штампы');
  });

  it('uses the employee request for a script and skips empty context', () => {
    const prompt = buildTaskPrompt({ kind: 'script', text: 'про рюкзак', replyContext: '', trends: '' });
    expect(prompt).toContain('Запрос сотрудника: про рюкзак');
    expect(prompt).not.toContain('Тренды дня');
  });
});

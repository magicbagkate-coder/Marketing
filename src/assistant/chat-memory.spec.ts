import { ChatMemory } from '@/assistant/chat-memory';

describe('ChatMemory', () => {
  it('keeps exchanges per chat in order', () => {
    const memory = new ChatMemory();
    memory.remember(1, 'q1', 'a1');
    memory.remember(2, 'other', 'other answer');
    expect(memory.history(1)).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
    ]);
    expect(memory.history(2)).toHaveLength(2);
    expect(memory.history(3)).toEqual([]);
  });

  it('forgets the oldest exchanges and always starts with a user turn', () => {
    const memory = new ChatMemory();
    for (let index = 0; index < 10; index += 1) memory.remember(1, `q${index}`, `a${index}`);
    const history = memory.history(1);
    expect(history).toHaveLength(12);
    expect(history[0]).toEqual({ role: 'user', content: 'q4' });
  });
});

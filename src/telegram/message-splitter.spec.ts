import { splitMessage } from '@/telegram/message-splitter';

describe('splitMessage', () => {
  it('keeps a short text as one message', () => {
    expect(splitMessage('hello\nworld', 100)).toEqual(['hello\nworld']);
  });

  it('splits on line ends when the text is too long', () => {
    expect(splitMessage('aaaa\nbbbb\ncccc', 9)).toEqual(['aaaa\nbbbb', 'cccc']);
  });

  it('cuts a single line that is longer than the limit', () => {
    expect(splitMessage('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('never returns a chunk over the limit', () => {
    const text = Array.from({ length: 50 }, (_, index) => `line number ${index}`).join('\n');
    expect(splitMessage(text, 40).every((chunk) => chunk.length <= 40)).toBe(true);
  });
});

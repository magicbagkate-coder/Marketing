import { toPlainText } from '@/telegram/plain-text';

describe('toPlainText', () => {
  it('removes tags, keeps line breaks and decodes entities', () => {
    expect(toPlainText('<b>Title</b>\n• <a href="https://x.y">a &amp; b</a> &lt;ok&gt;')).toBe('Title\n• a & b <ok>');
  });
});

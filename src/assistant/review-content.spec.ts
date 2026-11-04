import { buildPhotoContent, buildReviewContent } from '@/assistant/review-content';

const textOf = (block: { type: string; text?: string }): string => block.text ?? '';
const INFO = { durationSec: 21.5, width: 1080, height: 1920, hasAudio: true };

describe('buildReviewContent', () => {
  it('puts facts, speech, labelled frames and the answer format in order', () => {
    const blocks = buildReviewContent({
      info: INFO,
      caption: 'Новая модель',
      transcript: { status: 'ok', text: 'Привет, смотрите сумку' },
      frames: [
        { second: 0, base64: 'AAA' },
        { second: 2, base64: 'BBB' },
      ],
    });
    const types = blocks.map((block) => block.type);
    expect(types).toEqual(['text', 'text', 'text', 'image', 'text', 'image', 'text']);
    const first = blocks[0];
    expect(first.type === 'text' && first.text).toContain('вертикальное');
    expect(first.type === 'text' && first.text).toContain('Привет, смотрите сумку');
    expect(first.type === 'text' && first.text).toContain('Новая модель');
  });

  it('tells Claude when the speech could not be recognised', () => {
    const blocks = buildReviewContent({ info: INFO, caption: '', transcript: { status: 'no-key', text: '' }, frames: [] });
    const first = blocks[0];
    expect(first.type === 'text' && first.text).toContain('не распознана');
    expect(first.type === 'text' && first.text).toContain('Подписи от сотрудника нет');
  });
});

describe('buildReviewContent for a published reel', () => {
  it('uses the results-first instruction and keeps the employee numbers', () => {
    const blocks = buildReviewContent({
      info: INFO,
      caption: 'охват 40к, продаж 3',
      published: 'Это уже опубликованный рилс. Лайков: 120.',
      transcript: { status: 'silent', text: '' },
      frames: [],
    });
    expect(textOf(blocks[0])).toContain('Лайков: 120');
    expect(textOf(blocks[0])).toContain('охват 40к, продаж 3');
    expect(textOf(blocks[0])).not.toContain('Подписи от сотрудника нет');
    expect(textOf(blocks[blocks.length - 1])).toContain('УЖЕ ОПУБЛИКОВАННЫЙ');
  });

  it('uses the draft instruction for an uploaded file', () => {
    const blocks = buildReviewContent({ info: INFO, caption: '', transcript: { status: 'silent', text: '' }, frames: [] });
    expect(textOf(blocks[blocks.length - 1])).toContain('ЧЕРНОВИК');
  });
});

describe('buildPhotoContent', () => {
  it('sends one image between the intro and the format', () => {
    expect(buildPhotoContent('AAA', '').map((block) => block.type)).toEqual(['text', 'image', 'text']);
  });
});

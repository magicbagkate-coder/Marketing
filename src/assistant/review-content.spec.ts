import { buildLookContent, buildPhotoContent, buildPicturesContent, buildReviewContent, describeLook } from '@/assistant/review-content';

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

  it('adds the statistics screenshot as a labelled image before the instruction', () => {
    const blocks = buildReviewContent({
      info: INFO,
      caption: '',
      published: 'Опубликованный рилс.',
      screenshot: 'SSS',
      transcript: { status: 'silent', text: '' },
      frames: [],
    });
    expect(blocks.map((block) => block.type)).toEqual(['text', 'text', 'text', 'image', 'text']);
    expect(textOf(blocks[2])).toContain('Скриншот статистики');
  });

  it('uses the draft instruction for an uploaded file', () => {
    const blocks = buildReviewContent({ info: INFO, caption: '', transcript: { status: 'silent', text: '' }, frames: [] });
    expect(textOf(blocks[blocks.length - 1])).toContain('ЧЕРНОВИК');
  });
});

describe('buildLookContent', () => {
  it('numbers the pictures and answers the question, not the reel format', () => {
    const facts = describeLook(2, 'какая сумка интереснее?', '');
    const blocks = buildLookContent(
      [
        { base64: 'AAA', mediaType: 'image/jpeg' },
        { base64: 'BBB', mediaType: 'image/png' },
      ],
      facts,
    );
    expect(blocks.map((block) => block.type)).toEqual(['text', 'text', 'image', 'text', 'image', 'text']);
    expect(textOf(blocks[0])).toContain('какая сумка интереснее?');
    expect(textOf(blocks[3])).toBe('Картинка 2:');
    expect(textOf(blocks[5])).toContain('НЕ разбор рилса');
    expect(blocks[4]).toMatchObject({ source: { media_type: 'image/png' } });
  });

  it('tells Claude to recognise statistics, client messages and products by itself', () => {
    const blocks = buildLookContent([{ base64: 'AAA', mediaType: 'image/jpeg' }], describeLook(1, 'проанализируй', ''));
    const instruction = textOf(blocks[blocks.length - 1]);
    expect(instruction).toContain('Скриншоты статистики');
    expect(instruction).toContain('отзывов');
    expect(instruction).toContain('Товары и фото сумок');
  });

  it('asks a default question when the caption is empty', () => {
    expect(describeLook(1, '', '')).toContain('что из этого интереснее нашей аудитории');
  });
});

describe('buildPicturesContent', () => {
  it('numbers the bag photos and puts the prompt last', () => {
    const blocks = buildPicturesContent(
      [
        { base64: 'AAA', mediaType: 'image/jpeg' },
        { base64: 'BBB', mediaType: 'image/png' },
      ],
      'Напиши сценарий',
    );
    expect(blocks.map((block) => block.type)).toEqual(['text', 'image', 'text', 'image', 'text']);
    expect(textOf(blocks[2])).toBe('Фото 2:');
    expect(textOf(blocks[4])).toBe('Напиши сценарий');
  });
});

describe('buildPhotoContent', () => {
  it('sends one image between the intro and the format', () => {
    expect(buildPhotoContent('AAA', '').map((block) => block.type)).toEqual(['text', 'image', 'text']);
  });
});

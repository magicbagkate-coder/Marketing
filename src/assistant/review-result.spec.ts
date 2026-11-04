import { buildDigest, splitFramesLog } from '@/assistant/review-result';

describe('splitFramesLog', () => {
  it('cuts the service block out of the answer and returns it separately', () => {
    const raw = '<b>Вердикт:</b> доработать\n\n<frames>\n0 с: крупный план сумки\n3 с: текст на экране\n</frames>';
    expect(splitFramesLog(raw)).toEqual({ answer: '<b>Вердикт:</b> доработать', framesLog: '0 с: крупный план сумки\n3 с: текст на экране' });
  });

  it('keeps the answer as is when there is no block', () => {
    expect(splitFramesLog('Просто ответ')).toEqual({ answer: 'Просто ответ', framesLog: '' });
  });
});

describe('buildDigest', () => {
  it('appends the frame log when there is one', () => {
    expect(buildDigest('Факты', '0 с: кадр')).toBe('Факты\n\nКраткий лог кадров:\n0 с: кадр');
    expect(buildDigest('Факты', '')).toBe('Факты');
  });
});

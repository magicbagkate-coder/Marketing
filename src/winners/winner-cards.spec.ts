import type { WinnerCard } from '@/winners/winner-cards';

import { buildTopReels, parseCardFile, rankCards, renderCardFile } from '@/winners/winner-cards';

const card = (id: string, views: number | undefined, body = 'Хук: сумка в кадре'): WinnerCard => ({ id, views, note: '', body });

describe('card files', () => {
  it('keep the id, the numbers and the text between runs', () => {
    const restored = parseCardFile(renderCardFile({ id: 'AAA', views: 1500, note: 'рюкзак\nпродажи', body: 'Товар: рюкзак\n---\nХод' }));
    expect(restored).toEqual({ id: 'AAA', views: 1500, note: 'рюкзак продажи', body: 'Товар: рюкзак\n---\nХод' });
  });

  it('remember that the views were not given', () => {
    expect(parseCardFile(renderCardFile(card('B', undefined))).views).toBeUndefined();
  });
});

describe('rankCards', () => {
  it('puts the most viewed first and the reels without numbers last', () => {
    expect(rankCards([card('a', undefined), card('b', 10), card('c', 500)]).map((item) => item.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('buildTopReels', () => {
  it('numbers the reels by views and shows the numbers', () => {
    const { text, included } = buildTopReels([card('low', 10), card('top', 250_000)]);
    expect(included).toBe(2);
    expect(text.indexOf('№1 [top]')).toBeGreaterThan(-1);
    expect(text.indexOf('№1 [top]')).toBeLessThan(text.indexOf('№2 [low]'));
    expect(text).toContain('просмотры 250');
  });

  it('drops the least viewed reels when the size budget is over', () => {
    const body = 'x'.repeat(500);
    const result = buildTopReels([card('a', 3, body), card('b', 2, body), card('c', 1, body)], 1200);
    expect(result.included).toBe(2);
    expect(result.dropped).toBe(1);
    expect(result.text).not.toContain('[c]');
  });
});

import type { WinnerCard } from '@/winners/winner-cards';

import { buildTopReels, parseCardFile, rankCards, renderCardFile, shortBody } from '@/winners/winner-cards';

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

  it('shortens the cards of the less viewed reels once the full ones fill their share', () => {
    const body = ['Товар: сумка', 'Формат: демонстрация', 'Хук 0–3 с: пакеты', 'Ход ролика:', 'x'.repeat(60_000), 'Призыв к действию: в директ'].join('\n');
    const result = buildTopReels([card('a', 3, body), card('b', 2, body), card('c', 1, body)]);
    expect(result.shortened).toBe(2);
    expect(result.dropped).toBe(0);
    expect(result.text).toContain('Призыв к действию: в директ');
    expect(result.text.length).toBeLessThan(130_000);
  });

  it('keeps only the product, format, hook and call to action in a short card', () => {
    const body = 'Товар: а\nФормат: б\nХук 0–3 с: в\nХод ролика:\n0–5 с | кадр\nПризыв к действию: г\nПодпись: д';
    expect(shortBody(body)).toBe('Товар: а\nФормат: б\nХук 0–3 с: в\nПризыв к действию: г');
  });

  it('drops the least viewed reels when the size budget is over', () => {
    const body = 'x'.repeat(500);
    const result = buildTopReels([card('a', 3, body), card('b', 2, body), card('c', 1, body)], 1200);
    expect(result.included).toBe(2);
    expect(result.dropped).toBe(1);
    expect(result.text).not.toContain('[c]');
  });
});

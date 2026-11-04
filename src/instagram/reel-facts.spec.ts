import type { OwnPost } from '@/instagram/own-posts';

import { compareToNorm, describePublished } from '@/instagram/reel-facts';

const POST: OwnPost = {
  username: 'magicbag_ua',
  mediaType: 'VIDEO',
  mediaUrl: 'https://cdn.example/video.mp4',
  caption: 'Новая сумка',
  likes: 120,
  comments: 7,
  publishedAt: '2026-10-21T10:00:00+0000',
  baseline: { reels: 30, likes: 40, comments: 7 },
};
const LATER = new Date('2026-11-04T10:00:00Z');

describe('compareToNorm', () => {
  it('says higher, lower or normal', () => {
    expect(compareToNorm(120, 40)).toBe('в 3.0 раза выше нормы');
    expect(compareToNorm(10, 40)).toBe('в 4.0 раза ниже нормы');
    expect(compareToNorm(41, 40)).toBe('на уровне нормы');
    expect(compareToNorm(5, 0)).toBe('сравнить не с чем');
  });
});

describe('describePublished', () => {
  it('names the account, date, results, norm and caption', () => {
    const text = describePublished(POST, LATER);
    expect(text).toContain('@magicbag_ua');
    expect(text).toContain('21.10.2026');
    expect(text).toContain('Лайков: 120, комментариев: 7');
    expect(text).toContain('лайки в 3.0 раза выше нормы');
    expect(text).toContain('комментарии на уровне нормы');
    expect(text).toContain('Новая сумка');
    expect(text).not.toContain('предварительный');
  });

  it('warns that fresh numbers are still growing', () => {
    expect(describePublished(POST, new Date('2026-10-22T10:00:00Z'))).toContain('предварительный');
  });

  it('says so when there is no caption or no norm', () => {
    const text = describePublished({ ...POST, caption: ' ', baseline: { reels: 2, likes: 1, comments: 1 } }, LATER);
    expect(text).toContain('Подписи под рилсом нет');
    expect(text).toContain('Нормы аккаунта для сравнения нет');
  });
});

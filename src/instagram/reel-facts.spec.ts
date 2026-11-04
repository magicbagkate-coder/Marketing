import type { OwnPost } from '@/instagram/own-posts';

import { describePublished } from '@/instagram/reel-facts';

const POST: OwnPost = {
  username: 'magicbag_ua',
  mediaType: 'VIDEO',
  mediaUrl: 'https://cdn.example/video.mp4',
  caption: 'Новая сумка',
  likes: 120,
  comments: 7,
  publishedAt: '2026-10-21T10:00:00+0000',
};

describe('describePublished', () => {
  it('names the account, date, likes and caption', () => {
    const text = describePublished(POST);
    expect(text).toContain('@magicbag_ua');
    expect(text).toContain('21.10.2026');
    expect(text).toContain('Лайков: 120, комментариев: 7');
    expect(text).toContain('Новая сумка');
  });

  it('says so when there is no caption', () => {
    expect(describePublished({ ...POST, caption: ' ' })).toContain('Подписи под рилсом нет');
  });
});

import type { OwnPost } from '@/instagram/own-posts';

const CAPTION_LIMIT = 1500;

const formatDate = (iso: string): string => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : 'дата неизвестна');

/** Facts about a published reel that go to Claude next to the video. */
export function describePublished(post: OwnPost): string {
  const caption = post.caption.trim().slice(0, CAPTION_LIMIT);
  return [
    `Это уже опубликованный рилс аккаунта @${post.username}, дата публикации ${formatDate(post.publishedAt)}.`,
    `Лайков: ${post.likes}, комментариев: ${post.comments}. Охват и просмотры Instagram по чужому доступу не отдаёт, их нет.`,
    caption ? `Подпись под рилсом:\n${caption}` : 'Подписи под рилсом нет.',
    'Оцени ролик по тем же чек-листам и скажи, что в нём сработало, что тянет вниз и что поменять в следующих рилсах.',
  ].join('\n');
}

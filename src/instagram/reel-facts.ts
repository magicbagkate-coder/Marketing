import type { OwnPost } from '@/instagram/own-posts';

const CAPTION_LIMIT = 1500;
const MIN_BASELINE_REELS = 5;
const FRESH_DAYS = 3;
const MS_PER_DAY = 86_400_000;
const NORMAL_RANGE = { low: 0.8, high: 1.25 };
const MIN_RATIO = 0.01;

const formatDate = (iso: string): string => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : 'дата неизвестна');

/** Says how a number relates to the account's usual level. */
export function compareToNorm(value: number, norm: number): string {
  if (norm <= 0) return 'сравнить не с чем';
  const ratio = value / norm;
  if (ratio >= NORMAL_RANGE.high) return `в ${ratio.toFixed(1)} раза выше нормы`;
  return ratio <= NORMAL_RANGE.low ? `в ${(1 / Math.max(ratio, MIN_RATIO)).toFixed(1)} раза ниже нормы` : 'на уровне нормы';
}

function describeBaseline(post: OwnPost): string {
  const { baseline } = post;
  if (baseline.reels < MIN_BASELINE_REELS) return 'Нормы аккаунта для сравнения нет: мало рилсов.';
  return [
    `Норма аккаунта (медиана последних ${baseline.reels} рилсов): лайков ${baseline.likes}, комментариев ${baseline.comments}.`,
    `Этот рилс: лайки ${compareToNorm(post.likes, baseline.likes)}, комментарии ${compareToNorm(post.comments, baseline.comments)}.`,
  ].join(' ');
}

function describeAge(post: OwnPost, now: Date): string {
  const days = (now.getTime() - new Date(post.publishedAt).getTime()) / MS_PER_DAY;
  return days >= 0 && days < FRESH_DAYS ? 'Рилс опубликован меньше 3 дней назад, цифры ещё растут, вывод предварительный.' : '';
}

/** Facts and results of a published reel that go to Claude next to the video. */
export function describePublished(post: OwnPost, now: Date = new Date()): string {
  const caption = post.caption.trim().slice(0, CAPTION_LIMIT);
  return [
    `Это уже опубликованный рилс аккаунта @${post.username}, дата публикации ${formatDate(post.publishedAt)}.`,
    `Лайков: ${post.likes}, комментариев: ${post.comments}. Просмотры, охват, сохранения и продажи из Instagram не приходят: если сотрудник их не написал, их нет.`,
    describeBaseline(post),
    describeAge(post, now),
    caption ? `Подпись под рилсом:\n${caption}` : 'Подписи под рилсом нет.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

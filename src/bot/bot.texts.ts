// User-facing texts of the Telegram assistant (locale layer); code stays in English.

import type { BotCommand } from '@/telegram/telegram.types';

export const BOT_COMMANDS: BotCommand[] = [
  { command: 'ideas', description: 'Идеи для рилсов' },
  { command: 'script', description: 'Сценарий рилса' },
  { command: 'review', description: 'Оценить видео или кадр' },
  { command: 'id', description: 'Мой Telegram ID' },
  { command: 'help', description: 'Что я умею' },
];

export const buildIdText = (userId: number): string =>
  `Ваш Telegram ID: <code>${userId}</code>\nОтправьте его администратору, чтобы получить доступ к помощнику.`;

export const buildHelpText = (username: string): string =>
  [
    '<b>Помощник по рилсам MagicBag</b>',
    '',
    '/ideas 5 — идеи для рилсов (можно добавить тему)',
    '/script тема — сценарий рилса',
    '/review — оценка видео или кадра: пришлите файл с подписью /review (в личных сообщениях достаточно просто отправить видео)',
    '/review ссылка — разбор нашего рилса с @magicbagukraine или @magicbag_ua по ссылке на Instagram',
    '/id — ваш Telegram ID',
    '',
    `Задачу можно написать своими словами. В рабочей группе просто пишите вопрос, я отвечу сотрудникам из списка доступа (на ответы коллегам друг другу не реагирую). В других группах упомяните @${username} или ответьте на моё сообщение.`,
    'Видео: до 20 МБ и до 2 минут.',
  ].join('\n');

export const buildNoAccessText = (userId: number): string =>
  `У вас пока нет доступа. Ваш Telegram ID: <code>${userId}</code>. Отправьте его администратору.`;

export const buildReloadedText = (files: number): string => `База знаний обновлена, файлов: ${files}.`;

export const LIMIT_REACHED_TEXT = 'Дневной лимит запросов исчерпан, продолжим завтра.';
export const ERROR_TEXT = 'Не получилось обработать запрос. Попробуйте ещё раз чуть позже.';
export const NEED_MEDIA_TEXT =
  'Прикрепите видео или кадр: отправьте файл с подписью /review, ответьте командой /review на видео или пришлите ссылку на наш рилс.';
export const VIDEO_TOO_BIG_TEXT = 'Видео больше 20 МБ, Telegram не даёт боту его скачать. Сожмите видео или пришлите короче.';
export const VIDEO_TOO_LONG_TEXT = 'Видео длиннее 2 минут. Пришлите ролик покороче.';
export const BUSY_TEXT = 'Сейчас обрабатываю другие видео, повторите через минуту.';
export const PROCESSING_TEXT = 'Смотрю видео и слушаю звук, это займёт около минуты.';
export const FETCHING_REEL_TEXT = 'Нашла ссылку, скачиваю рилс и смотрю его, это займёт около минуты.';

type ReelProblemTexts = { [problem: string]: string };

export const REEL_PROBLEM_TEXTS: ReelProblemTexts = {
  'not-configured': 'Доступ к Instagram не настроен, ссылки пока не читаю. Пришлите видео файлом.',
  'not-found': 'Не нашла этот рилс среди последних публикаций @magicbagukraine и @magicbag_ua. По ссылкам читаю только наши страницы, чужие рилсы пришлите видео файлом.',
  'not-video': 'По этой ссылке не рилс, а фото или карусель. Пришлите кадр файлом с подписью /review.',
  'no-file': 'Instagram не отдал видеофайл этого рилса (так бывает с чужой музыкой). Скачайте рилс и пришлите файлом.',
  'too-big': 'Видео этого рилса слишком большое для разбора. Пришлите сжатую версию файлом.',
};

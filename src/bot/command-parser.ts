import type { BotIdentity, TelegramFileRef, TelegramMessage, TelegramPhotoSize } from '@/telegram/telegram.types';

import { findReelCode } from '@/instagram/reel-link';

export type IntentKind = 'ignore' | 'id' | 'help' | 'ideas' | 'script' | 'review' | 'look' | 'chat' | 'reload';
export type MediaKind = 'video' | 'photo';

export type MediaRef = {
  fileId: string;
  kind: MediaKind;
  sizeBytes: number;
  durationSec: number;
};

export type MessageIntent = {
  kind: IntentKind;
  text: string;
  media?: MediaRef;
  /** Short code of an Instagram reel link in the message (or in the message it replies to). */
  reelCode?: string;
  /** A photo sent together with a reel link is a screenshot of the reel's Instagram statistics, not a picture to review. */
  screenshot?: MediaRef;
  /** Pictures sent with a question (choose the best bag, compare covers): answered as a question, not as a reel review. */
  looks?: MediaRef[];
  replyContext: string;
};

type CommandParts = {
  command: string;
  rest: string;
};

type Work = {
  media?: MediaRef;
  ownCode?: string;
};

type ResolvedMedia = { media?: MediaRef; screenshot?: MediaRef; looks?: MediaRef[] };

const FOREIGN_COMMAND = '?foreign';
const COMMAND_KINDS = new Map<string, IntentKind>([
  ['/id', 'id'],
  ['/start', 'help'],
  ['/help', 'help'],
  ['/ideas', 'ideas'],
  ['/script', 'script'],
  ['/review', 'review'],
  ['/reload', 'reload'],
]);

function readText(message: TelegramMessage): string {
  return (message.text ?? message.caption ?? '').trim();
}

function splitCommand(text: string, botUsername: string): CommandParts {
  if (!text.startsWith('/')) return { command: '', rest: text };
  const [head, ...tail] = text.split(/\s+/);
  const [name, target] = head.toLowerCase().split('@');
  const foreign = target !== undefined && target !== botUsername.toLowerCase();
  return { command: foreign ? FOREIGN_COMMAND : name, rest: tail.join(' ').trim() };
}

function stripMention(text: string, botUsername: string): string {
  return text.replace(new RegExp(`@${botUsername}`, 'gi'), '').replace(/[ \t]+/g, ' ').trim();
}

function videoDocument(message: TelegramMessage): TelegramFileRef | undefined {
  return message.document?.mime_type?.startsWith('video/') ? message.document : undefined;
}

function imageDocument(message: TelegramMessage): TelegramFileRef | undefined {
  return message.document?.mime_type?.startsWith('image/') ? message.document : undefined;
}

function findVideo(message: TelegramMessage): TelegramFileRef | undefined {
  return message.video ?? message.video_note ?? message.animation ?? videoDocument(message);
}

function toVideoRef(file: TelegramFileRef): MediaRef {
  return { fileId: file.file_id, kind: 'video', sizeBytes: file.file_size ?? 0, durationSec: file.duration ?? 0 };
}

function toImageRef(file: { file_id: string; file_size?: number } | undefined): MediaRef | undefined {
  return file ? { fileId: file.file_id, kind: 'photo', sizeBytes: file.file_size ?? 0, durationSec: 0 } : undefined;
}

const largestPhoto = (message: TelegramMessage): TelegramPhotoSize | undefined => message.photo?.at(-1);

/** A picture of the message: a Telegram photo or an image sent as a file. */
export function pickImage(message: TelegramMessage): MediaRef | undefined {
  return toImageRef(largestPhoto(message) ?? imageDocument(message));
}

function pickMedia(message: TelegramMessage): MediaRef | undefined {
  const video = findVideo(message);
  return video ? toVideoRef(video) : pickImage(message);
}

function pickReplyMedia(message: TelegramMessage): MediaRef | undefined {
  return message.reply_to_message ? pickMedia(message.reply_to_message) : undefined;
}

function readReplyContext(message: TelegramMessage): string {
  return (message.reply_to_message?.text ?? message.reply_to_message?.caption ?? '').trim();
}

function isAddressed(message: TelegramMessage, text: string, bot: BotIdentity): boolean {
  if (message.chat.type === 'private') return true;
  if (text.toLowerCase().includes(`@${bot.username.toLowerCase()}`)) return true;
  return message.reply_to_message?.from?.id === bot.id;
}

function kindFromCommand(command: string): IntentKind | undefined {
  return command === FOREIGN_COMMAND ? 'ignore' : COMMAND_KINDS.get(command);
}

function kindFromContent(addressed: boolean, hasWork: boolean, text: string): IntentKind {
  if (!addressed) return 'ignore';
  if (hasWork) return 'review';
  return text ? 'chat' : 'ignore';
}

const isPicturesOnly = (work: Work): boolean => work.media?.kind === 'photo' && work.ownCode === undefined;

/** Pictures sent without /review are a question about pictures (choose, compare), not a reel review. */
function refineKind(kind: IntentKind, command: string, work: Work): IntentKind {
  return kind === 'review' && command === '' && isPicturesOnly(work) ? 'look' : kind;
}

function classifyMedia(media: MediaRef | undefined, kind: IntentKind, reelCode: string | undefined): ResolvedMedia {
  if (media === undefined) return {};
  if (kind === 'look') return { looks: [media] };
  return reelCode !== undefined && media.kind === 'photo' ? { screenshot: media } : { media };
}

function resolveReelCode(message: TelegramMessage, kind: IntentKind, ownCode: string | undefined): string | undefined {
  if (ownCode || kind !== 'review') return ownCode;
  return findReelCode(readReplyContext(message));
}

const detectWork = (message: TelegramMessage, body: string): Work => ({
  media: pickMedia(message) ?? pickReplyMedia(message),
  ownCode: findReelCode(body),
});

/** Decides what a Telegram message is asking for. In groups only commands, mentions and replies to the bot count. */
export function parseMessage(message: TelegramMessage, bot: BotIdentity): MessageIntent {
  const text = readText(message);
  const { command, rest } = splitCommand(text, bot.username);
  const body = command ? rest : stripMention(text, bot.username);
  const work = detectWork(message, body);
  const hasWork = work.media !== undefined || work.ownCode !== undefined;
  const first = kindFromCommand(command) ?? kindFromContent(isAddressed(message, text, bot), hasWork, body);
  const kind = refineKind(first, command, work);
  const reelCode = resolveReelCode(message, kind, work.ownCode);
  return { kind, text: body, ...classifyMedia(work.media, kind, reelCode), reelCode, replyContext: readReplyContext(message) };
}

const MAX_ALBUM_IMAGES = 10;

/**
 * Photos sent as one album arrive as separate messages and only one of them carries the caption.
 * The caption decides what is asked; all the pictures of the album go together into one request.
 */
export function parseAlbum(messages: TelegramMessage[], bot: BotIdentity): MessageIntent {
  const lead = messages.find((message) => readText(message)) ?? messages[0];
  const intent = parseMessage(lead, bot);
  const looks = messages.flatMap((message) => pickImage(message) ?? []).slice(0, MAX_ALBUM_IMAGES);
  return looks.length >= 2 && isPictureQuestion(intent) ? { ...intent, kind: 'look', media: undefined, looks } : intent;
}

const isPictureQuestion = (intent: MessageIntent): boolean =>
  (intent.kind === 'look' || intent.kind === 'review') && intent.reelCode === undefined;

import type { BotIdentity, TelegramFileRef, TelegramMessage, TelegramPhotoSize } from '@/telegram/telegram.types';

export type IntentKind = 'ignore' | 'id' | 'help' | 'ideas' | 'script' | 'review' | 'chat' | 'reload';
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
  replyContext: string;
};

type CommandParts = {
  command: string;
  rest: string;
};

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

function findVideo(message: TelegramMessage): TelegramFileRef | undefined {
  return message.video ?? message.video_note ?? message.animation ?? videoDocument(message);
}

function toVideoRef(file: TelegramFileRef): MediaRef {
  return { fileId: file.file_id, kind: 'video', sizeBytes: file.file_size ?? 0, durationSec: file.duration ?? 0 };
}

function toPhotoRef(photo: TelegramPhotoSize | undefined): MediaRef | undefined {
  return photo ? { fileId: photo.file_id, kind: 'photo', sizeBytes: photo.file_size ?? 0, durationSec: 0 } : undefined;
}

function pickMedia(message: TelegramMessage): MediaRef | undefined {
  const video = findVideo(message);
  return video ? toVideoRef(video) : toPhotoRef(message.photo?.at(-1));
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

function kindFromContent(addressed: boolean, hasMedia: boolean, text: string): IntentKind {
  if (!addressed) return 'ignore';
  if (hasMedia) return 'review';
  return text ? 'chat' : 'ignore';
}

/** Decides what a Telegram message is asking for. In groups only commands, mentions and replies to the bot count. */
export function parseMessage(message: TelegramMessage, bot: BotIdentity): MessageIntent {
  const text = readText(message);
  const { command, rest } = splitCommand(text, bot.username);
  const body = command ? rest : stripMention(text, bot.username);
  const ownMedia = pickMedia(message);
  const kind = kindFromCommand(command) ?? kindFromContent(isAddressed(message, text, bot), ownMedia !== undefined, body);
  const media = ownMedia ?? (kind === 'review' ? pickReplyMedia(message) : undefined);
  return { kind, text: body, media, replyContext: readReplyContext(message) };
}

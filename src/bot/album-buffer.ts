import type { TelegramMessage } from '@/telegram/telegram.types';

type Pending = {
  messages: TelegramMessage[];
  timer: NodeJS.Timeout;
};

export const ALBUM_WAIT_MS = 1500;

/** Albums arrive as separate messages: collect them until no new picture has come for a moment, then pass them on together. */
export class AlbumBuffer {
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly onReady: (messages: TelegramMessage[]) => void,
    private readonly waitMs: number = ALBUM_WAIT_MS,
  ) {}

  /** Returns false when the message is not part of an album and must be handled right away. */
  add(message: TelegramMessage): boolean {
    if (!message.media_group_id) return false;
    const key = `${message.chat.id}:${message.media_group_id}`;
    const current = this.pending.get(key);
    if (current) clearTimeout(current.timer);
    const messages = [...(current?.messages ?? []), message];
    this.pending.set(key, { messages, timer: setTimeout(() => this.flush(key), this.waitMs) });
    return true;
  }

  private flush(key: string): void {
    const album = this.pending.get(key);
    this.pending.delete(key);
    if (album) this.onReady([...album.messages].sort((first, second) => first.message_id - second.message_id));
  }
}

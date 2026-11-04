import type { TelegramMessage } from '@/telegram/telegram.types';

import { AlbumBuffer } from '@/bot/album-buffer';

const photoMessage = (id: number, group?: string): TelegramMessage => ({
  message_id: id,
  chat: { id: -100, type: 'supergroup' },
  media_group_id: group,
  photo: [{ file_id: `p${id}`, width: 100, height: 100 }],
});

describe('AlbumBuffer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not take messages that are not part of an album', () => {
    const buffer = new AlbumBuffer(jest.fn());
    expect(buffer.add(photoMessage(1))).toBe(false);
  });

  it('hands over the whole album, in order, after a quiet moment', () => {
    const ready = jest.fn();
    const buffer = new AlbumBuffer(ready, 1000);
    expect(buffer.add(photoMessage(12, 'g1'))).toBe(true);
    buffer.add(photoMessage(11, 'g1'));
    jest.advanceTimersByTime(900);
    buffer.add(photoMessage(13, 'g1'));
    jest.advanceTimersByTime(900);
    expect(ready).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(ready.mock.calls[0][0].map((message: TelegramMessage) => message.message_id)).toEqual([11, 12, 13]);
  });

  it('keeps different albums apart', () => {
    const ready = jest.fn();
    const buffer = new AlbumBuffer(ready, 1000);
    buffer.add(photoMessage(1, 'a'));
    buffer.add(photoMessage(2, 'b'));
    jest.advanceTimersByTime(1000);
    expect(ready).toHaveBeenCalledTimes(2);
  });
});

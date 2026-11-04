import type { TelegramMessage } from '@/telegram/telegram.types';

import { parseMessage } from '@/bot/command-parser';

const BOT = { id: 999, username: 'magicbag_trends_bot' };

function makeMessage(overrides: Partial<TelegramMessage>): TelegramMessage {
  return { message_id: 1, chat: { id: -100, type: 'supergroup' }, from: { id: 5, is_bot: false }, ...overrides };
}

describe('parseMessage', () => {
  it('recognises commands, also with the bot name', () => {
    expect(parseMessage(makeMessage({ text: '/id' }), BOT).kind).toBe('id');
    expect(parseMessage(makeMessage({ text: '/ideas@magicbag_trends_bot 5 про рюкзаки' }), BOT)).toMatchObject({ kind: 'ideas', text: '5 про рюкзаки' });
  });

  it('ignores commands meant for another bot and unaddressed group text', () => {
    expect(parseMessage(makeMessage({ text: '/id@other_bot' }), BOT).kind).toBe('ignore');
    expect(parseMessage(makeMessage({ text: 'всем привет' }), BOT).kind).toBe('ignore');
  });

  it('answers a mention or a reply to the bot in a group', () => {
    expect(parseMessage(makeMessage({ text: '@magicbag_trends_bot накидай идеи' }), BOT)).toMatchObject({ kind: 'chat', text: 'накидай идеи' });
    const reply = makeMessage({ text: 'а теперь короче', reply_to_message: makeMessage({ from: { id: 999, is_bot: true }, text: 'сводка' }) });
    expect(parseMessage(reply, BOT)).toMatchObject({ kind: 'chat', replyContext: 'сводка' });
  });

  it('treats any private text as a request and any private video as a review', () => {
    const privateChat = { id: 5, type: 'private' };
    expect(parseMessage(makeMessage({ chat: privateChat, text: 'идеи для рилса' }), BOT).kind).toBe('chat');
    const video = { file_id: 'v1', file_size: 1000, duration: 20 };
    const intent = parseMessage(makeMessage({ chat: privateChat, video }), BOT);
    expect(intent.kind).toBe('review');
    expect(intent.media).toEqual({ fileId: 'v1', kind: 'video', sizeBytes: 1000, durationSec: 20 });
  });

  it('reviews a video sent with /review in a group, and a replied video', () => {
    const video = { file_id: 'v2', duration: 10 };
    expect(parseMessage(makeMessage({ caption: '/review', video }), BOT).kind).toBe('review');
    const reply = makeMessage({ text: '/review', reply_to_message: makeMessage({ video }) });
    expect(parseMessage(reply, BOT).media?.fileId).toBe('v2');
  });

  it('takes the largest photo as a photo review', () => {
    const photo = [
      { file_id: 'small', width: 90, height: 160 },
      { file_id: 'big', width: 720, height: 1280 },
    ];
    const intent = parseMessage(makeMessage({ caption: '/review', photo }), BOT);
    expect(intent.media).toMatchObject({ fileId: 'big', kind: 'photo' });
  });
});

import type { TelegramMessage } from '@/telegram/telegram.types';

import { parseAlbum, parseMessage } from '@/bot/command-parser';

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

  it('reviews an Instagram reel link sent with /review or with a mention', () => {
    const link = 'https://www.instagram.com/reel/DfUMSnPx13g/';
    expect(parseMessage(makeMessage({ text: `/review ${link}` }), BOT)).toMatchObject({ kind: 'review', reelCode: 'DfUMSnPx13g' });
    expect(parseMessage(makeMessage({ text: `@magicbag_trends_bot оцени ${link}` }), BOT)).toMatchObject({ kind: 'review', reelCode: 'DfUMSnPx13g' });
  });

  it('takes the reel link from the message that /review replies to', () => {
    const reply = makeMessage({ text: '/review', reply_to_message: makeMessage({ text: 'https://www.instagram.com/reel/AbC/' }) });
    expect(parseMessage(reply, BOT)).toMatchObject({ kind: 'review', reelCode: 'AbC' });
  });

  it('treats a photo sent with a reel link as a statistics screenshot, not as a picture to review', () => {
    const photo = [{ file_id: 'stats', width: 720, height: 1280 }];
    const intent = parseMessage(makeMessage({ caption: '/review https://www.instagram.com/reel/AbC/ охват 40к', photo }), BOT);
    expect(intent).toMatchObject({ kind: 'review', reelCode: 'AbC', screenshot: { fileId: 'stats', kind: 'photo' } });
    expect(intent.media).toBeUndefined();
  });

  it('still reviews a lone photo as a picture', () => {
    const photo = [{ file_id: 'cover', width: 720, height: 1280 }];
    const intent = parseMessage(makeMessage({ caption: '/review', photo }), BOT);
    expect(intent.media).toMatchObject({ fileId: 'cover' });
    expect(intent.screenshot).toBeUndefined();
  });

  describe('pictures with a question', () => {
    const photo = (id: string) => [{ file_id: id, width: 720, height: 1280 }];

    it('answers pictures sent with a question as a question, not as a reel review', () => {
      const intent = parseMessage(makeMessage({ caption: '@magicbag_trends_bot какая сумка интереснее нашей аудитории?', photo: photo('a') }), BOT);
      expect(intent).toMatchObject({ kind: 'look', text: 'какая сумка интереснее нашей аудитории?' });
      expect(intent.looks).toHaveLength(1);
      expect(intent.media).toBeUndefined();
    });

    it('treats pictures sent as files like photos', () => {
      const document = { file_id: 'doc', mime_type: 'image/png', file_size: 1000 };
      const intent = parseMessage(makeMessage({ caption: '@magicbag_trends_bot что скажешь?', document }), BOT);
      expect(intent).toMatchObject({ kind: 'look', looks: [{ fileId: 'doc', kind: 'photo' }] });
    });

    it('reviews a replied picture when the bot is mentioned', () => {
      const reply = makeMessage({ text: '@magicbag_trends_bot что скажешь?', reply_to_message: makeMessage({ photo: photo('r') }) });
      expect(parseMessage(reply, BOT)).toMatchObject({ kind: 'look', looks: [{ fileId: 'r' }] });
    });

    it('keeps a video as a review even without the command', () => {
      const video = { file_id: 'v', duration: 20 };
      expect(parseMessage(makeMessage({ caption: '@magicbag_trends_bot посмотри', video }), BOT)).toMatchObject({ kind: 'review' });
    });

    it('gathers all pictures of an album and takes the question from the caption', () => {
      const album = [
        makeMessage({ message_id: 1, photo: photo('a'), media_group_id: 'g' }),
        makeMessage({ message_id: 2, photo: photo('b'), media_group_id: 'g', caption: '@magicbag_trends_bot какая интереснее?' }),
        makeMessage({ message_id: 3, photo: photo('c'), media_group_id: 'g' }),
      ];
      const intent = parseAlbum(album, BOT);
      expect(intent).toMatchObject({ kind: 'look', text: 'какая интереснее?' });
      expect(intent.looks?.map((look) => look.fileId)).toEqual(['a', 'b', 'c']);
    });

    it('treats an album with /review as pictures to compare, and ignores an unaddressed one', () => {
      const withCommand = [
        makeMessage({ message_id: 1, photo: photo('a'), media_group_id: 'g', caption: '/review' }),
        makeMessage({ message_id: 2, photo: photo('b'), media_group_id: 'g' }),
      ];
      expect(parseAlbum(withCommand, BOT).kind).toBe('look');
      const quiet = [makeMessage({ photo: photo('a'), media_group_id: 'g' }), makeMessage({ message_id: 2, photo: photo('b'), media_group_id: 'g' })];
      expect(parseAlbum(quiet, BOT).kind).toBe('ignore');
    });
  });

  describe('script for a bag on the photos', () => {
    const photo = (id: string) => [{ file_id: id, width: 720, height: 1280 }];

    it('takes a photo with a script request as the bag to write for, not as a question', () => {
      const intent = parseMessage(makeMessage({ caption: '@magicbag_trends_bot напиши сценарий', photo: photo('bag') }), BOT);
      expect(intent).toMatchObject({ kind: 'script', looks: [{ fileId: 'bag' }] });
      expect(intent.media).toBeUndefined();
    });

    it('takes the /script command with a photo the same way', () => {
      const intent = parseMessage(makeMessage({ caption: '/script для вечернего образа', photo: photo('bag') }), BOT);
      expect(intent).toMatchObject({ kind: 'script', text: 'для вечернего образа', looks: [{ fileId: 'bag' }] });
    });

    it('takes a replied photo when the bot is asked for a script', () => {
      const reply = makeMessage({ text: '@magicbag_trends_bot напиши сценарий', reply_to_message: makeMessage({ photo: photo('r') }) });
      expect(parseMessage(reply, BOT)).toMatchObject({ kind: 'script', looks: [{ fileId: 'r' }] });
    });

    it('gathers all the photos of an album for one script', () => {
      const album = [
        makeMessage({ message_id: 1, photo: photo('a'), media_group_id: 'g' }),
        makeMessage({ message_id: 2, photo: photo('b'), media_group_id: 'g', caption: '/script' }),
      ];
      const intent = parseAlbum(album, BOT);
      expect(intent.kind).toBe('script');
      expect(intent.looks?.map((look) => look.fileId)).toEqual(['a', 'b']);
    });

    it('keeps a photo without a script request as a question about the picture', () => {
      expect(parseMessage(makeMessage({ caption: '@magicbag_trends_bot что скажешь?', photo: photo('a') }), BOT).kind).toBe('look');
    });

    it('keeps a text script request without photos as a plain script request', () => {
      const intent = parseMessage(makeMessage({ text: '/script про рюкзак' }), BOT);
      expect(intent.kind).toBe('script');
      expect(intent.looks).toBeUndefined();
    });
  });

  it('counts the reel links so that the bot can ask for one at a time', () => {
    const two = '/review https://www.instagram.com/reel/AAA/ https://www.instagram.com/reel/BBB/';
    expect(parseMessage(makeMessage({ text: two }), BOT).reelLinks).toBe(2);
    expect(parseMessage(makeMessage({ text: '/review https://www.instagram.com/reel/AAA/' }), BOT).reelLinks).toBe(1);
    expect(parseMessage(makeMessage({ text: '/ideas 5' }), BOT).reelLinks).toBe(0);
  });

  it('ignores a link in an unaddressed group message', () => {
    expect(parseMessage(makeMessage({ text: 'смотрите https://www.instagram.com/reel/AbC/' }), BOT).kind).toBe('ignore');
  });
});

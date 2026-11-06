import { addFolderFiles, parseSourceLines, parseViews } from '@/winners/winner-sources';

describe('parseViews', () => {
  it('reads plain numbers, thousands separators and short forms', () => {
    expect(parseViews('125000')).toBe(125_000);
    expect(parseViews('125 000')).toBe(125_000);
    expect(parseViews('125к')).toBe(125_000);
    expect(parseViews('1,2м')).toBe(1_200_000);
    expect(parseViews('1.2 млн')).toBe(1_200_000);
    expect(parseViews('48k')).toBe(48_000);
  });

  it('does not take words for views', () => {
    expect(parseViews('залетел с хука')).toBeUndefined();
    expect(parseViews('')).toBeUndefined();
  });
});

describe('parseSourceLines', () => {
  it('reads links with views and a note, in the owner order', () => {
    const text = [
      'https://www.instagram.com/reel/AAA111/ ; 250к ; рюкзак, много продаж',
      'https://www.instagram.com/reel/BBB222/',
      '# комментарий',
      '',
      'https://www.instagram.com/reel/CCC333/?igsh=x;80 000',
    ].join('\n');
    const sources = parseSourceLines(text);
    expect(sources.map((source) => source.id)).toEqual(['AAA111', 'BBB222', 'CCC333']);
    expect(sources[0]).toMatchObject({ reelCode: 'AAA111', views: 250_000, note: 'рюкзак, много продаж' });
    expect(sources[1]).toMatchObject({ views: undefined, note: '' });
    expect(sources[2].views).toBe(80_000);
  });

  it('treats a second column that is not a number as the note', () => {
    expect(parseSourceLines('https://www.instagram.com/reel/AAA/;зашёл хук')[0]).toMatchObject({ views: undefined, note: 'зашёл хук' });
  });

  it('reads video file names, skips unknown lines and repeated reels', () => {
    const text = 'bag one.mp4;12к\nпросто текст\nhttps://www.instagram.com/reel/AAA/\nhttps://www.instagram.com/reel/AAA/;5к';
    const sources = parseSourceLines(text);
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ id: 'bag-one', fileName: 'bag one.mp4', views: 12_000 });
    expect(sources[1].views).toBeUndefined();
  });
});

describe('addFolderFiles', () => {
  it('adds videos from the folder that the list does not mention', () => {
    const listed = parseSourceLines('a.mp4;10к');
    const all = addFolderFiles(listed, ['a.mp4', 'b.MOV', 'notes.txt']);
    expect(all.map((source) => source.fileName)).toEqual(['a.mp4', 'b.MOV']);
  });
});

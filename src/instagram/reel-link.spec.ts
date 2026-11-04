import { findReelCode } from '@/instagram/reel-link';

describe('findReelCode', () => {
  it('reads the code from reel, reels, p and tv links', () => {
    expect(findReelCode('https://www.instagram.com/reel/DfUMSnPx13g/')).toBe('DfUMSnPx13g');
    expect(findReelCode('https://instagram.com/reels/Ab-c_1/?igsh=xyz')).toBe('Ab-c_1');
    expect(findReelCode('смотри instagram.com/p/XyZ123 вот')).toBe('XyZ123');
    expect(findReelCode('https://www.instagram.com/tv/Tv1/')).toBe('Tv1');
  });

  it('reads links that include the account name', () => {
    expect(findReelCode('https://www.instagram.com/magicbag_ua/reel/DfUMbVVs-g9/')).toBe('DfUMbVVs-g9');
  });

  it('returns undefined when there is no post link', () => {
    expect(findReelCode('накидай 5 идей')).toBeUndefined();
    expect(findReelCode('https://www.instagram.com/magicbag_ua/')).toBeUndefined();
  });
});

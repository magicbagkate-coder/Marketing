import { pickFrameTimes } from '@/media/frame-times';

describe('pickFrameTimes', () => {
  it('looks at the first seconds densely and spreads the rest up to the end', () => {
    const times = pickFrameTimes(30, 12);
    expect(times).toHaveLength(12);
    expect(times.slice(0, 4)).toEqual([0, 0.5, 1, 2]);
    expect(times.at(-1)).toBeLessThanOrEqual(30);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('uses only early frames for a very short clip', () => {
    expect(pickFrameTimes(2.5, 12)).toEqual([0, 0.5, 1, 2]);
    expect(pickFrameTimes(0.3, 12)).toEqual([0]);
  });

  it('never returns more frames than allowed', () => {
    expect(pickFrameTimes(60, 6)).toHaveLength(6);
    expect(pickFrameTimes(60, 2)).toHaveLength(2);
  });
});

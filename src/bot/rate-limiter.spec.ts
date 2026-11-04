import { RateLimiter } from '@/bot/rate-limiter';

describe('RateLimiter', () => {
  const monday = new Date('2026-11-02T10:00:00Z');
  const tuesday = new Date('2026-11-03T10:00:00Z');

  it('allows requests up to the limit and then refuses', () => {
    const limiter = new RateLimiter(2);
    expect([limiter.tryConsume(1, monday), limiter.tryConsume(1, monday), limiter.tryConsume(1, monday)]).toEqual([true, true, false]);
  });

  it('counts each user separately and resets on the next day', () => {
    const limiter = new RateLimiter(1);
    expect(limiter.tryConsume(1, monday)).toBe(true);
    expect(limiter.tryConsume(2, monday)).toBe(true);
    expect(limiter.tryConsume(1, monday)).toBe(false);
    expect(limiter.tryConsume(1, tuesday)).toBe(true);
  });
});

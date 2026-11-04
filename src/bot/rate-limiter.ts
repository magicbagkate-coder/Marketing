type DayCounter = {
  day: string;
  count: number;
};

/** Per-user daily request counter (Kyiv time), kept in memory. */
export class RateLimiter {
  private readonly counters = new Map<number, DayCounter>();

  constructor(private readonly limit: number) {}

  tryConsume(userId: number, now: Date = new Date()): boolean {
    const day = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' });
    const entry = this.counters.get(userId);
    const count = entry?.day === day ? entry.count : 0;
    if (count >= this.limit) return false;
    this.counters.set(userId, { day, count: count + 1 });
    return true;
  }
}

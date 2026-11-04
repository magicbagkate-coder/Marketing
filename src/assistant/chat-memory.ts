import { clip } from '@/common/clip';

export type MemoryTurn = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_EXCHANGES = 6;
const MAX_TURN_CHARS = 4000;

/** Remembers the last few exchanges of each chat so that follow-ups like «а теперь короче» make sense. */
export class ChatMemory {
  private readonly turns = new Map<number, MemoryTurn[]>();

  history(chatId: number): MemoryTurn[] {
    return this.turns.get(chatId) ?? [];
  }

  remember(chatId: number, question: string, answer: string): void {
    const next: MemoryTurn[] = [
      ...this.history(chatId),
      { role: 'user', content: clip(question, MAX_TURN_CHARS) },
      { role: 'assistant', content: clip(answer, MAX_TURN_CHARS) },
    ];
    this.turns.set(chatId, next.slice(-MAX_EXCHANGES * 2));
  }
}

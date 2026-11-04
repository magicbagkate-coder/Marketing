import type { ClaudeChatService } from '@/assistant/claude-chat.service';
import type { KnowledgeService } from '@/assistant/knowledge.service';

import { ReelTalkService } from '@/assistant/reel-talk.service';

const REVIEW = { answer: 'Вердикт: доработать', digest: 'Расшифровка: привет' };

function makeService(reply = 'Ответ по ролику'): { service: ReelTalkService; ask: jest.Mock } {
  const ask = jest.fn().mockResolvedValue(reply);
  const knowledge = { textFor: jest.fn().mockReturnValue('база знаний') } as unknown as KnowledgeService;
  const service = new ReelTalkService({ ask } as unknown as ClaudeChatService, knowledge);
  return { service, ask };
}

describe('ReelTalkService', () => {
  it('finds the dossier by a reply to any of the bot messages of the review', () => {
    const { service } = makeService();
    service.start(-100, [11, 12], REVIEW);
    expect(service.find({ chatId: -100, replyTo: 12, isPrivate: false })?.digest).toBe(REVIEW.digest);
    expect(service.find({ chatId: -100, replyTo: 99, isPrivate: false })).toBeUndefined();
    expect(service.find({ chatId: -100, isPrivate: false })).toBeUndefined();
    expect(service.find({ chatId: -200, replyTo: 12, isPrivate: false })).toBeUndefined();
  });

  it('uses the latest video in a private chat even without a reply', () => {
    const { service } = makeService();
    service.start(5, [1], REVIEW);
    expect(service.find({ chatId: 5, isPrivate: true })?.digest).toBe(REVIEW.digest);
  });

  it('forgets a private chat video after half an hour', () => {
    const { service } = makeService();
    service.start(5, [1], REVIEW);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 60 * 1000);
    expect(service.find({ chatId: 5, isPrivate: true })).toBeUndefined();
    expect(service.find({ chatId: 5, replyTo: 1, isPrivate: true })?.digest).toBe(REVIEW.digest);
    jest.restoreAllMocks();
  });

  it('answers from the dossier and remembers the exchange', async () => {
    const { service, ask } = makeService('Хук слабый, вот почему');
    service.start(-100, [11], REVIEW);
    const dossier = service.find({ chatId: -100, replyTo: 11, isPrivate: false });
    if (!dossier) throw new Error('dossier not found');
    expect(await service.answer(dossier, 'почему хук слабый?')).toBe('Хук слабый, вот почему');
    const sent = ask.mock.calls[0][0].messages;
    expect(sent[0].content).toContain('Расшифровка: привет');
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'почему хук слабый?' });
    expect(dossier.turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
  });

  it('links the answer messages to the same dossier', () => {
    const { service } = makeService();
    service.start(-100, [11], REVIEW);
    const dossier = service.find({ chatId: -100, replyTo: 11, isPrivate: false });
    if (!dossier) throw new Error('dossier not found');
    service.link(-100, [21, 22], dossier);
    expect(service.find({ chatId: -100, replyTo: 22, isPrivate: false })).toBe(dossier);
  });
});

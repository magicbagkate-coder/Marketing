import { NO_VIEWS_LABEL, TOP_REELS_FILE_HEADER } from '@/winners/winners.texts';

/** The description of one winning reel: what is in it, by seconds, plus the numbers the owner gave. */
export type WinnerCard = {
  id: string;
  views?: number;
  note: string;
  body: string;
};

const CARD_SEPARATOR = '\n---\n';
/** Cards go into the prompt of every script, so the library has a size budget; the least viewed reels are dropped first. */
export const CARDS_BUDGET_CHARS = 150_000;
/** The most viewed reels get the full card (the table by seconds) until this size, the rest get a short one. */
export const FULL_CARDS_BUDGET_CHARS = 100_000;
const SHORT_PREFIXES = ['Товар:', 'Формат:', 'Хук', 'Призыв'];

const formatViews = (views: number | undefined): string => (views === undefined ? NO_VIEWS_LABEL : `просмотры ${views.toLocaleString('ru-RU')}`);

/** The text of a card file kept between runs, so a reel is analysed only once. */
export function renderCardFile(card: WinnerCard): string {
  const head = [`id: ${card.id}`, `views: ${card.views ?? ''}`, `note: ${card.note.replace(/\s+/g, ' ')}`].join('\n');
  return `${head}${CARD_SEPARATOR}${card.body.trim()}\n`;
}

function readField(head: string, name: string): string {
  const line = head.split('\n').find((row) => row.startsWith(`${name}: `));
  return line ? line.slice(name.length + 2).trim() : '';
}

export function parseCardFile(text: string): WinnerCard {
  const [head, ...rest] = text.split(CARD_SEPARATOR);
  const views = Number(readField(head, 'views'));
  return {
    id: readField(head, 'id'),
    views: readField(head, 'views') === '' || Number.isNaN(views) ? undefined : views,
    note: readField(head, 'note'),
    body: rest.join(CARD_SEPARATOR).trim(),
  };
}

/** Most viewed first; reels without numbers keep their order after the ones with numbers. */
export function rankCards(cards: WinnerCard[]): WinnerCard[] {
  return [...cards].sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
}

const stripTags = (line: string): string => line.replace(/<\/?[a-z]+>/gi, '').trim();

/** The short form of a card: what the product is, the format, the hook and the call to action. */
export function shortBody(body: string): string {
  return body
    .split('\n')
    .filter((line) => SHORT_PREFIXES.some((prefix) => stripTags(line).startsWith(prefix)))
    .join('\n');
}

function renderForPrompt(card: WinnerCard, place: number, short = false): string {
  const note = card.note ? `\nЗаметка владелицы: ${card.note}` : '';
  return `### Рилс-победитель №${place} [${card.id}], ${formatViews(card.views)}${note}\n${short ? shortBody(card.body) : card.body}`;
}

/** The full card while the full cards still fit their share of the budget, then the short one. */
function fitCard(card: WinnerCard, place: number, total: number): { part: string; isFull: boolean } {
  const full = renderForPrompt(card, place);
  const isFull = total + full.length <= FULL_CARDS_BUDGET_CHARS;
  return { part: isFull ? full : renderForPrompt(card, place, true), isFull };
}

export type TopReels = {
  text: string;
  included: number;
  shortened: number;
  dropped: number;
};

/** The library file for the knowledge base: ranked cards, the less viewed ones shortened, cut off at the size budget. */
export function buildTopReels(cards: WinnerCard[], budget: number = CARDS_BUDGET_CHARS): TopReels {
  const parts: string[] = [];
  let total = 0;
  let shortened = 0;
  for (const [index, card] of rankCards(cards).entries()) {
    const { part, isFull } = fitCard(card, index + 1, total);
    if (total + part.length > budget) break;
    parts.push(part);
    total += part.length;
    shortened += isFull ? 0 : 1;
  }
  return { text: [TOP_REELS_FILE_HEADER, ...parts].join('\n\n'), included: parts.length, shortened, dropped: cards.length - parts.length };
}

/** All the cards as one text for the pattern summary (without the size budget of the prompt library). */
export function cardsForSummary(cards: WinnerCard[]): string {
  return rankCards(cards)
    .map((card, index) => renderForPrompt(card, index + 1))
    .join('\n\n');
}

import { XMLParser } from 'fast-xml-parser';

import type { NewsItem } from '@/sources/source.types';

import { SUMMARY_LIMIT } from '@/collector/collector.constants';
import { stripHtml } from '@/common/strip-html';

type XmlNode = { [key: string]: unknown };

const DATE_KEYS = ['pubDate', 'published', 'updated', 'dc:date'];
const SUMMARY_KEYS = ['description', 'summary', 'content:encoded'];

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null;
}

function asNode(value: unknown): XmlNode {
  return isNode(value) ? value : {};
}

function toList(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return isNode(value) ? toText(value['#text']) : '';
}

function readFirst(node: XmlNode, keys: string[]): string {
  const key = keys.find((name) => toText(node[name]) !== '');
  return key === undefined ? '' : toText(node[key]);
}

function readLink(link: unknown): string {
  const first = toList(link)[0];
  if (isNode(first)) return toText(first['@_href']).trim();
  return toText(first).trim();
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shorten(text: string): string {
  return text.length > SUMMARY_LIMIT ? `${text.slice(0, SUMMARY_LIMIT).trimEnd()}…` : text;
}

function buildItem(node: XmlNode, source: string): NewsItem | null {
  const title = stripHtml(toText(node.title));
  const link = readLink(node.link);
  const publishedAt = parseDate(readFirst(node, DATE_KEYS));
  if (!title || !link || !publishedAt) return null;
  const summary = shorten(stripHtml(readFirst(node, SUMMARY_KEYS)));
  return { source, title, link, summary, publishedAt };
}

/** Parses an RSS 2.0 or Atom feed into news items; entries without title, link or date are skipped. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const root = asNode(xmlParser.parse(xml));
  const rssItems = toList(asNode(asNode(root.rss).channel).item);
  const atomItems = toList(asNode(root.feed).entry);
  return [...rssItems, ...atomItems]
    .map((node) => buildItem(asNode(node), source))
    .filter((item): item is NewsItem => item !== null);
}

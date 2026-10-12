import type { NewsSource } from '@/sources/source.types';

// Public Instagram business/creator accounts, read through the official Business Discovery API.
export const instagramAccounts: string[] = [
  'voguemagazine',
  'vogueitalia',
  'britishvogue',
  'voguefrance',
  'harpersbazaarus',
  'wwd',
  'whowhatwear',
  'purseblog',
  'thestylestalkercom',
  'shotbygio',
  'advancedstyle',
];

// Each source is a verified RSS/Atom feed. vogue.ua and lofficiel.com have no readable feed yet.
export const newsSources: NewsSource[] = [
  { name: 'Vogue US', feedUrl: 'https://www.vogue.com/feed/rss' },
  { name: 'Vogue Italia', feedUrl: 'https://www.vogue.it/feed/rss' },
  { name: 'Vogue France', feedUrl: 'https://www.vogue.fr/feed/rss' },
  { name: 'British Vogue', feedUrl: 'https://www.vogue.co.uk/feed/rss' },
  { name: 'Harper\'s Bazaar', feedUrl: 'https://www.harpersbazaar.com/rss/all.xml' },
  { name: 'Harper\'s Bazaar Celebrity', feedUrl: 'https://www.harpersbazaar.com/rss/celebrity.xml' },
  { name: 'Elle US', feedUrl: 'https://www.elle.com/rss/all.xml' },
  { name: 'Elle France', feedUrl: 'https://cdn-elle.ladmedia.fr/var/plain_site/storage/flux_rss/fluxToutELLEfr.xml' },
  { name: 'Marie Claire', feedUrl: 'https://www.marieclaire.com/feeds.xml' },
  { name: 'Glamour', feedUrl: 'https://www.glamour.com/feed/rss' },
  { name: 'WWD', feedUrl: 'https://wwd.com/feed/rss/' },
  { name: 'Hypebeast', feedUrl: 'https://hypebeast.com/feed' },
  { name: 'Highsnobiety', feedUrl: 'https://www.highsnobiety.com/feed' },
  { name: 'Who What Wear', feedUrl: 'https://www.whowhatwear.com/feeds.xml' },
  { name: 'Hello!', feedUrl: 'https://www.hellomagazine.com/feeds/rss/any/any/any/50.xml' },
  { name: 'Tatler', feedUrl: 'https://www.tatler.com/feed/rss' },
  { name: 'The Zoe Report', feedUrl: 'https://www.thezoereport.com/rss' },
  { name: 'E! Online', feedUrl: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml' },
];

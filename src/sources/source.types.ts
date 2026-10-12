export type NewsSource = {
  name: string;
  feedUrl: string;
};

export type NewsItem = {
  source: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: Date;
};

export type CollectResult = {
  items: NewsItem[];
  failedSources: string[];
};

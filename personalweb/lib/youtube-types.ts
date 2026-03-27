export type YouTubeMatchedVideoAsset = {
  id: string;
  title: string;
  channelTitle: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string;
  embedUrl: string;
  viewCount: number;
  viewCountLabel: string;
  matchedQuery: string;
};

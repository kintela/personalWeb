export type YouTubeMatchedVideoAsset = {
  id: string;
  platform: "youtube" | "dailymotion";
  title: string;
  channelTitle: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string;
  embedUrl: string;
  viewCount: number;
  viewCountLabel: string;
  durationSeconds: number | null;
  durationLabel: string | null;
  matchedQuery: string;
};

export type RankedYouTubeVideoAsset = {
  cacheKey: string;
  trackName: string;
  artistsLabel: string;
  albumName: string | null;
  albumReleaseYear: string | null;
  rating: number;
  matchedQuery: string | null;
  video: YouTubeMatchedVideoAsset;
};

export type RankedYouTubeVideoListResult = {
  videos: RankedYouTubeVideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

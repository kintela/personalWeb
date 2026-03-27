import "server-only";

import type { YouTubeMatchedVideoAsset } from "@/lib/youtube-types";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_WATCH_BASE_URL = "https://www.youtube.com/watch";
const YOUTUBE_EMBED_BASE_URL = "https://www.youtube.com/embed";

type SearchSongVideoInput = {
  trackName: string;
  artistsLabel: string;
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: {
        high?: {
          url?: string;
        };
        medium?: {
          url?: string;
        };
        default?: {
          url?: string;
        };
      };
    };
  }>;
};

type YouTubeVideoListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: {
        high?: {
          url?: string;
        };
        medium?: {
          url?: string;
        };
        default?: {
          url?: string;
        };
      };
    };
    status?: {
      embeddable?: boolean;
    };
    statistics?: {
      viewCount?: string;
    };
  }>;
};

type SearchCandidate = {
  id: string;
  title: string;
  description: string | null;
  channelTitle: string;
  thumbnailUrl: string | null;
  embeddable: boolean;
  viewCount: number;
};

const NEGATIVE_TITLE_HINTS = [
  "cover",
  "karaoke",
  "reaction",
  "tutorial",
  "lesson",
  "guitar lesson",
  "drum cover",
  "bass cover",
  "live",
  "slowed",
  "sped up",
  "8d audio",
];

const POSITIVE_TITLE_HINTS = ["official", "music video", "topic", "audio"];

function normalizeEnvValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getYouTubeApiKey() {
  return normalizeEnvValue(process.env.YOUTUBE_API_KEY);
}

export function isYouTubeConfigured() {
  return Boolean(getYouTubeApiKey());
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanTrackNameForSearch(trackName: string) {
  return compactWhitespace(
    trackName
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*]/g, " ")
      .replace(/-\s*(mono|stereo|remaster(?:ed)?(?:\s*\d{2,4})?|mix(?:\s*\d{2,4})?|version|edit)\b.*$/i, " ")
      .replace(/\b(remaster(?:ed)?|mono|stereo|mix)\b/gi, " "),
  );
}

function getSearchQuery({ trackName, artistsLabel }: SearchSongVideoInput) {
  const cleanedTrackName = cleanTrackNameForSearch(trackName);
  const cleanedArtistsLabel = compactWhitespace(artistsLabel.replaceAll("·", " "));

  return compactWhitespace(`${cleanedArtistsLabel} ${cleanedTrackName}`);
}

function getThumbnailUrl(candidate: {
  snippet?: {
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}) {
  return (
    candidate.snippet?.thumbnails?.high?.url?.trim() ||
    candidate.snippet?.thumbnails?.medium?.url?.trim() ||
    candidate.snippet?.thumbnails?.default?.url?.trim() ||
    null
  );
}

function formatViewCountLabel(viewCount: number) {
  return new Intl.NumberFormat("es-ES").format(viewCount);
}

function buildEmbedUrl(videoId: string) {
  const url = new URL(`${YOUTUBE_EMBED_BASE_URL}/${videoId}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");

  return url.toString();
}

function buildExternalUrl(videoId: string) {
  const url = new URL(YOUTUBE_WATCH_BASE_URL);
  url.searchParams.set("v", videoId);

  return url.toString();
}

function tokenize(value: string) {
  return normalizeForComparison(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function getVideoScore(
  candidate: SearchCandidate,
  input: SearchSongVideoInput,
) {
  const normalizedTitle = normalizeForComparison(candidate.title);
  const normalizedChannel = normalizeForComparison(candidate.channelTitle);
  const cleanedTrackName = cleanTrackNameForSearch(input.trackName);
  const normalizedTrackName = normalizeForComparison(cleanedTrackName);
  const normalizedArtists = normalizeForComparison(input.artistsLabel);
  const trackTokens = tokenize(cleanedTrackName);
  const artistTokens = tokenize(input.artistsLabel);
  let score = 0;

  if (normalizedTrackName && normalizedTitle.includes(normalizedTrackName)) {
    score += 120;
  }

  if (normalizedArtists && normalizedTitle.includes(normalizedArtists)) {
    score += 60;
  }

  if (normalizedArtists && normalizedChannel.includes(normalizedArtists)) {
    score += 35;
  }

  score += trackTokens.filter((token) => normalizedTitle.includes(token)).length * 12;
  score += artistTokens.filter((token) => normalizedTitle.includes(token)).length * 9;

  if (artistTokens.some((token) => normalizedChannel.includes(token))) {
    score += 18;
  }

  for (const hint of POSITIVE_TITLE_HINTS) {
    if (normalizedTitle.includes(hint)) {
      score += 8;
    }
  }

  for (const hint of NEGATIVE_TITLE_HINTS) {
    if (normalizedTitle.includes(hint)) {
      score -= 24;
    }
  }

  if (!candidate.embeddable) {
    score -= 200;
  }

  return score;
}

async function fetchYouTubeJson<T>(path: string, params: URLSearchParams) {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    throw new Error("Falta YOUTUBE_API_KEY para hablar con YouTube.");
  }

  params.set("key", apiKey);
  const response = await fetch(`${YOUTUBE_API_BASE_URL}${path}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube devolvió ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function searchYouTubeSongVideo(
  input: SearchSongVideoInput,
): Promise<YouTubeMatchedVideoAsset | null> {
  if (!isYouTubeConfigured()) {
    throw new Error("Falta YOUTUBE_API_KEY para buscar vídeos en YouTube.");
  }

  const searchQuery = getSearchQuery(input);

  if (!searchQuery) {
    return null;
  }

  const searchResponse = await fetchYouTubeJson<YouTubeSearchResponse>(
    "/search",
    new URLSearchParams({
      part: "snippet",
      type: "video",
      q: searchQuery,
      maxResults: "10",
      order: "viewCount",
      videoEmbeddable: "true",
    }),
  );
  const videoIds = searchResponse.items
    ?.map((item) => item.id?.videoId?.trim() || "")
    .filter(Boolean) ?? [];

  if (videoIds.length === 0) {
    return null;
  }

  const videoResponse = await fetchYouTubeJson<YouTubeVideoListResponse>(
    "/videos",
    new URLSearchParams({
      part: "snippet,statistics,status",
      id: videoIds.join(","),
      maxResults: String(videoIds.length),
    }),
  );

  const candidates = (videoResponse.items ?? [])
    .map((item) => {
      const id = item.id?.trim() || "";
      const title = item.snippet?.title?.trim() || "";
      const channelTitle = item.snippet?.channelTitle?.trim() || "";

      if (!id || !title || !channelTitle) {
        return null;
      }

      return {
        id,
        title,
        description: item.snippet?.description?.trim() || null,
        channelTitle,
        thumbnailUrl: getThumbnailUrl(item),
        embeddable: item.status?.embeddable !== false,
        viewCount: Number.parseInt(item.statistics?.viewCount ?? "0", 10) || 0,
      } satisfies SearchCandidate;
    })
    .filter((candidate): candidate is SearchCandidate => candidate !== null);

  if (candidates.length === 0) {
    return null;
  }

  const bestCandidate = [...candidates]
    .sort((left, right) => {
      const leftScore = getVideoScore(left, input);
      const rightScore = getVideoScore(right, input);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      if (right.viewCount !== left.viewCount) {
        return right.viewCount - left.viewCount;
      }

      return left.title.localeCompare(right.title, "es", {
        sensitivity: "base",
      });
    })[0];

  if (!bestCandidate || getVideoScore(bestCandidate, input) < 40) {
    return null;
  }

  return {
    id: bestCandidate.id,
    title: bestCandidate.title,
    channelTitle: bestCandidate.channelTitle,
    description: bestCandidate.description,
    thumbnailUrl: bestCandidate.thumbnailUrl,
    externalUrl: buildExternalUrl(bestCandidate.id),
    embedUrl: buildEmbedUrl(bestCandidate.id),
    viewCount: bestCandidate.viewCount,
    viewCountLabel: formatViewCountLabel(bestCandidate.viewCount),
    matchedQuery: searchQuery,
  } satisfies YouTubeMatchedVideoAsset;
}

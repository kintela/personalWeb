import "server-only";

import {
  readYouTubeMatchCache,
  upsertYouTubeMatchCache,
} from "@/lib/supabase/youtube-match-cache";
import type { YouTubeMatchedVideoAsset } from "@/lib/youtube-types";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_WATCH_BASE_URL = "https://www.youtube.com/watch";
const YOUTUBE_EMBED_BASE_URL = "https://www.youtube.com/embed";

type SearchSongVideoInput = {
  trackName: string;
  artistsLabel: string;
  albumName?: string | null;
  albumReleaseYear?: string | null;
};

type ManualYouTubeSongVideoInput = SearchSongVideoInput & {
  videoUrl: string;
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

type YouTubeVideoListItem = NonNullable<YouTubeVideoListResponse["items"]>[number];

type SearchCandidate = {
  id: string;
  title: string;
  description: string | null;
  channelTitle: string;
  thumbnailUrl: string | null;
  embeddable: boolean;
  viewCount: number;
};

const POSITIVE_TITLE_HINT_WEIGHTS = [
  ["official music video", 72],
  ["official video", 60],
  ["official audio", 44],
  ["music video", 26],
  ["audio", 8],
  ["official", 20],
  ["hd", 4],
  ["4k", 4],
] as const;

const NEGATIVE_TITLE_HINT_WEIGHTS = [
  ["playthrough", -130],
  ["drum playthrough", -180],
  ["guitar playthrough", -180],
  ["bass playthrough", -180],
  ["drum cover", -130],
  ["guitar cover", -130],
  ["bass cover", -130],
  ["piano cover", -130],
  ["instrumental", -55],
  ["drum", -28],
  ["guitar", -18],
  ["bass", -18],
  ["topic", -90],
  ["remaster", -60],
  ["remastered", -60],
  ["mix", -55],
  ["radio edit", -55],
  ["edit", -32],
  ["live", -30],
  ["cover", -36],
  ["karaoke", -42],
  ["reaction", -38],
  ["tutorial", -44],
  ["lesson", -44],
  ["lyrics", -26],
  ["lyric video", -26],
  ["slowed", -42],
  ["sped up", -42],
  ["8d audio", -42],
] as const;

const POSITIVE_CHANNEL_HINT_WEIGHTS = [
  ["vevo", 80],
  ["official", 16],
] as const;

const NEGATIVE_CHANNEL_HINT_WEIGHTS = [["topic", -120]] as const;

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

function normalizeNullableValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function isValidYouTubeVideoId(value: string) {
  return /^[A-Za-z0-9_-]{11}$/.test(value.trim());
}

function getNormalizedYouTubeUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}

function getYouTubePathVideoId(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";

  return isValidYouTubeVideoId(normalizedValue) ? normalizedValue : null;
}

function extractYouTubeVideoId(value: string) {
  const trimmedValue = value.trim();

  if (isValidYouTubeVideoId(trimmedValue)) {
    return trimmedValue;
  }

  let url: URL;

  try {
    url = new URL(getNormalizedYouTubeUrl(trimmedValue));
  } catch {
    return null;
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return getYouTubePathVideoId(url.pathname.split("/")[1]);
  }

  if (
    hostname !== "youtube.com" &&
    hostname !== "m.youtube.com" &&
    hostname !== "music.youtube.com" &&
    hostname !== "youtube-nocookie.com"
  ) {
    return null;
  }

  if (url.pathname === "/watch") {
    return getYouTubePathVideoId(url.searchParams.get("v") ?? undefined);
  }

  const [, pathRoot, pathVideoId] = url.pathname.split("/");

  if (["embed", "shorts", "live", "v"].includes(pathRoot ?? "")) {
    return getYouTubePathVideoId(pathVideoId);
  }

  return null;
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

  return compactWhitespace(`${cleanedArtistsLabel} "${cleanedTrackName}"`);
}

function getSearchCacheKey(input: SearchSongVideoInput) {
  const cleanedTrackName = cleanTrackNameForSearch(input.trackName);

  return [
    normalizeForComparison(cleanedTrackName),
    normalizeForComparison(compactWhitespace(input.artistsLabel.replaceAll("·", " "))),
    normalizeForComparison(normalizeNullableValue(input.albumName) ?? ""),
    normalizeForComparison(normalizeNullableValue(input.albumReleaseYear) ?? ""),
  ].join("::");
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

function buildMatchedVideoAssetFromVideoItem(
  item: YouTubeVideoListItem,
  matchedQuery: string,
): YouTubeMatchedVideoAsset | null {
  const id = item.id?.trim() || "";
  const title = item.snippet?.title?.trim() || "";
  const channelTitle = item.snippet?.channelTitle?.trim() || "";

  if (!id || !title || !channelTitle) {
    return null;
  }

  const viewCount = Number.parseInt(item.statistics?.viewCount ?? "0", 10) || 0;

  return {
    id,
    title,
    channelTitle,
    description: item.snippet?.description?.trim() || null,
    thumbnailUrl: getThumbnailUrl(item),
    externalUrl: buildExternalUrl(id),
    embedUrl: buildEmbedUrl(id),
    viewCount,
    viewCountLabel: formatViewCountLabel(viewCount),
    matchedQuery,
  } satisfies YouTubeMatchedVideoAsset;
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
  const normalizedDescription = normalizeForComparison(candidate.description ?? "");
  const cleanedTrackName = cleanTrackNameForSearch(input.trackName);
  const normalizedTrackName = normalizeForComparison(cleanedTrackName);
  const normalizedArtists = normalizeForComparison(input.artistsLabel);
  const normalizedAlbumName = normalizeForComparison(input.albumName ?? "");
  const normalizedAlbumReleaseYear = normalizeForComparison(
    input.albumReleaseYear ?? "",
  );
  const trackTokens = tokenize(cleanedTrackName);
  const artistTokens = tokenize(input.artistsLabel);
  const titleTrackMatches = trackTokens.filter((token) =>
    normalizedTitle.includes(token),
  );
  const descriptionTrackMatches = trackTokens.filter((token) =>
    normalizedDescription.includes(token),
  );
  const titleTrackCoverage = trackTokens.length
    ? titleTrackMatches.length / trackTokens.length
    : 0;
  const descriptionTrackCoverage = trackTokens.length
    ? descriptionTrackMatches.length / trackTokens.length
    : 0;
  let score = 0;

  if (normalizedTrackName && normalizedTitle.includes(normalizedTrackName)) {
    score += 220;
  } else if (
    normalizedTrackName &&
    normalizedDescription.includes(normalizedTrackName)
  ) {
    score += 48;
  }

  if (normalizedArtists && normalizedTitle.includes(normalizedArtists)) {
    score += 60;
  }

  if (normalizedArtists && normalizedChannel.includes(normalizedArtists)) {
    score += 35;
  }

  if (normalizedArtists && normalizedChannel === normalizedArtists) {
    score += 140;
  }

  score += titleTrackMatches.length * 20;
  score += descriptionTrackMatches.length * 4;
  score += artistTokens.filter((token) => normalizedTitle.includes(token)).length * 9;

  if (artistTokens.some((token) => normalizedChannel.includes(token))) {
    score += 18;
  }

  if (titleTrackCoverage === 1) {
    score += 120;
  } else if (titleTrackCoverage >= 0.75) {
    score += 40;
  } else if (titleTrackCoverage === 0 && descriptionTrackCoverage === 0) {
    score -= 220;
  } else if (titleTrackCoverage < 0.5) {
    score -= 90;
  }

  if (
    normalizedArtists &&
    normalizedTrackName &&
    normalizedTitle.includes(normalizedArtists) &&
    normalizedTitle.includes(normalizedTrackName)
  ) {
    score += 40;
  }

  if (
    normalizedAlbumName &&
    (normalizedTitle.includes(normalizedAlbumName) ||
      normalizedDescription.includes(normalizedAlbumName))
  ) {
    score += 10;
  }

  if (
    normalizedAlbumReleaseYear &&
    (normalizedTitle.includes(normalizedAlbumReleaseYear) ||
      normalizedDescription.includes(normalizedAlbumReleaseYear))
  ) {
    score += 8;
  }

  for (const [hint, weight] of POSITIVE_TITLE_HINT_WEIGHTS) {
    if (normalizedTitle.includes(hint)) {
      score += weight;
    }
  }

  for (const [hint, weight] of NEGATIVE_TITLE_HINT_WEIGHTS) {
    if (normalizedTitle.includes(hint)) {
      score += weight;
    }
  }

  for (const [hint, weight] of POSITIVE_CHANNEL_HINT_WEIGHTS) {
    if (normalizedChannel.includes(hint)) {
      score += weight;
    }
  }

  for (const [hint, weight] of NEGATIVE_CHANNEL_HINT_WEIGHTS) {
    if (normalizedChannel.includes(hint)) {
      score += weight;
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

    if (response.status === 403 && errorText.includes("quotaExceeded")) {
      throw new Error(
        "YouTube ha agotado la cuota diaria de la API para búsquedas nuevas. Los vídeos ya cacheados seguirán funcionando; para el resto toca esperar al siguiente reset o ampliar cuota.",
      );
    }

    throw new Error(`YouTube devolvió ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function saveManualYouTubeSongVideo(
  input: ManualYouTubeSongVideoInput,
): Promise<YouTubeMatchedVideoAsset> {
  if (!isYouTubeConfigured()) {
    throw new Error(
      "Falta YOUTUBE_API_KEY para validar el vídeo manual en YouTube.",
    );
  }

  const videoId = extractYouTubeVideoId(input.videoUrl);

  if (!videoId) {
    throw new Error("Pega un enlace válido de YouTube o un ID de vídeo.");
  }

  const matchedQuery = `manual:${buildExternalUrl(videoId)}`;
  const cacheKey = getSearchCacheKey(input);
  const videoResponse = await fetchYouTubeJson<YouTubeVideoListResponse>(
    "/videos",
    new URLSearchParams({
      part: "snippet,statistics,status",
      id: videoId,
      maxResults: "1",
    }),
  );
  const matchedVideoItem = videoResponse.items?.[0];

  if (!matchedVideoItem?.id) {
    throw new Error("No he encontrado ese vídeo en YouTube.");
  }

  if (matchedVideoItem.status?.embeddable === false) {
    throw new Error("Ese vídeo no permite reproducción embebida.");
  }

  const matchedVideo = buildMatchedVideoAssetFromVideoItem(
    matchedVideoItem,
    matchedQuery,
  );

  if (!matchedVideo) {
    throw new Error("No he podido leer los datos de ese vídeo en YouTube.");
  }

  const saveResult = await upsertYouTubeMatchCache({
    cacheKey,
    trackName: input.trackName,
    artistsLabel: input.artistsLabel,
    albumName: input.albumName,
    albumReleaseYear: input.albumReleaseYear,
    matchedQuery,
    video: matchedVideo,
  });

  if (!saveResult.ok) {
    throw new Error(saveResult.error);
  }

  return matchedVideo;
}

export async function searchYouTubeSongVideo(
  input: SearchSongVideoInput,
): Promise<YouTubeMatchedVideoAsset | null> {
  if (!isYouTubeConfigured()) {
    throw new Error("Falta YOUTUBE_API_KEY para buscar vídeos en YouTube.");
  }

  const searchQuery = getSearchQuery(input);
  const cacheKey = getSearchCacheKey(input);

  if (!searchQuery) {
    return null;
  }

  const cachedResult = await readYouTubeMatchCache(cacheKey);

  if (cachedResult.status === "hit") {
    return cachedResult.video;
  }

  const searchResponse = await fetchYouTubeJson<YouTubeSearchResponse>(
    "/search",
    new URLSearchParams({
      part: "snippet",
      type: "video",
      q: searchQuery,
      maxResults: "15",
      order: "relevance",
      videoEmbeddable: "true",
    }),
  );
  const videoIds = searchResponse.items
    ?.map((item) => item.id?.videoId?.trim() || "")
    .filter(Boolean) ?? [];

  if (videoIds.length === 0) {
    await upsertYouTubeMatchCache({
      cacheKey,
      trackName: input.trackName,
      artistsLabel: input.artistsLabel,
      albumName: input.albumName,
      albumReleaseYear: input.albumReleaseYear,
      matchedQuery: searchQuery,
      video: null,
    });
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
    await upsertYouTubeMatchCache({
      cacheKey,
      trackName: input.trackName,
      artistsLabel: input.artistsLabel,
      albumName: input.albumName,
      albumReleaseYear: input.albumReleaseYear,
      matchedQuery: searchQuery,
      video: null,
    });
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
    await upsertYouTubeMatchCache({
      cacheKey,
      trackName: input.trackName,
      artistsLabel: input.artistsLabel,
      albumName: input.albumName,
      albumReleaseYear: input.albumReleaseYear,
      matchedQuery: searchQuery,
      video: null,
    });
    return null;
  }

  const matchedVideo = {
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

  await upsertYouTubeMatchCache({
    cacheKey,
    trackName: input.trackName,
    artistsLabel: input.artistsLabel,
    albumName: input.albumName,
    albumReleaseYear: input.albumReleaseYear,
    matchedQuery: searchQuery,
    video: matchedVideo,
  });

  return matchedVideo;
}

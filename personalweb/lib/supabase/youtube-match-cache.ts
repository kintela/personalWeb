import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  RankedYouTubeVideoAsset,
  RankedYouTubeVideoListResult,
  YouTubeMatchedVideoAsset,
} from "@/lib/youtube-types";

type YouTubeMatchRating = 0 | 1 | 2 | 3 | 4 | 5;

type YouTubeMatchCacheLookupResult =
  | {
      status: "hit";
      video: YouTubeMatchedVideoAsset | null;
    }
  | {
      status: "miss";
    };

type YouTubeVideoMatchCacheRow = {
  cache_key: string;
  track_name?: string | null;
  artists_label?: string | null;
  album_name?: string | null;
  album_release_year?: string | null;
  matched_query: string | null;
  has_match: boolean;
  video_id: string | null;
  title: string | null;
  channel_title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  embed_url: string | null;
  view_count: number | string | null;
  rating: number | string | null;
};

type YouTubeVideoMatchCacheSummaryRow = {
  cache_key: string;
  rating: number | string | null;
};

type UpsertYouTubeVideoMatchCacheInput = {
  cacheKey: string;
  trackName: string;
  artistsLabel: string;
  albumName?: string | null;
  albumReleaseYear?: string | null;
  matchedQuery: string;
  video: YouTubeMatchedVideoAsset | null;
};

type UpsertYouTubeMatchRatingInput = {
  cacheKey: string;
  trackName: string;
  artistsLabel: string;
  albumName?: string | null;
  albumReleaseYear?: string | null;
  rating: YouTubeMatchRating;
};

type UpsertYouTubeVideoMatchCacheResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getSupabasePublicKey();
}

function createSupabaseServerClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeNullableValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function normalizeMatchRating(
  value: number | string | null | undefined,
): YouTubeMatchRating {
  const normalizedValue =
    typeof value === "number"
      ? value
      : Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(normalizedValue)) {
    return 0;
  }

  if (normalizedValue < 0) {
    return 0;
  }

  if (normalizedValue > 5) {
    return 5;
  }

  return normalizedValue as YouTubeMatchRating;
}

function formatViewCountLabel(viewCount: number) {
  return new Intl.NumberFormat("es-ES").format(viewCount);
}

function mapRowToVideoAsset(
  row: YouTubeVideoMatchCacheRow,
): YouTubeMatchedVideoAsset | null {
  if (!row.has_match || !row.video_id || !row.title || !row.channel_title) {
    return null;
  }

  const viewCount =
    typeof row.view_count === "number"
      ? row.view_count
      : Number.parseInt(row.view_count ?? "0", 10) || 0;

  return {
    id: row.video_id,
    title: row.title,
    channelTitle: row.channel_title,
    description: normalizeNullableValue(row.description),
    thumbnailUrl: normalizeNullableValue(row.thumbnail_url),
    externalUrl: normalizeNullableValue(row.external_url) ?? "",
    embedUrl: normalizeNullableValue(row.embed_url) ?? "",
    viewCount,
    viewCountLabel: formatViewCountLabel(viewCount),
    matchedQuery: normalizeNullableValue(row.matched_query) ?? "",
  } satisfies YouTubeMatchedVideoAsset;
}

function mapRowToRankedVideoAsset(
  row: YouTubeVideoMatchCacheRow,
): RankedYouTubeVideoAsset | null {
  const video = mapRowToVideoAsset(row);
  const cacheKey = row.cache_key.trim();
  const trackName = normalizeNullableValue(row.track_name) ?? "";
  const artistsLabel = normalizeNullableValue(row.artists_label) ?? "";

  if (!video || !cacheKey || !trackName || !artistsLabel) {
    return null;
  }

  return {
    cacheKey,
    trackName,
    artistsLabel,
    albumName: normalizeNullableValue(row.album_name),
    albumReleaseYear: normalizeNullableValue(row.album_release_year),
    rating: normalizeMatchRating(row.rating),
    matchedQuery: normalizeNullableValue(row.matched_query),
    video,
  } satisfies RankedYouTubeVideoAsset;
}

export async function getRankedYouTubeVideoList(): Promise<RankedYouTubeVideoListResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      videos: [],
      configured: false,
      error: "Falta configurar Supabase para leer el bloque MTV.",
      totalCount: 0,
    };
  }

  try {
    const { data, error } = await supabase
      .from("youtube_video_matches")
      .select(
        "cache_key, track_name, artists_label, album_name, album_release_year, matched_query, has_match, video_id, title, channel_title, description, thumbnail_url, external_url, embed_url, view_count, rating",
      )
      .eq("has_match", true)
      .gt("rating", 0)
      .order("rating", { ascending: false })
      .order("artists_label", { ascending: true })
      .order("track_name", { ascending: true })
      .returns<YouTubeVideoMatchCacheRow[]>();

    if (error) {
      return {
        videos: [],
        configured: true,
        error: `No he podido leer la caché MTV: ${error.message}`,
        totalCount: 0,
      };
    }

    const videos = (data ?? [])
      .map((row) => mapRowToRankedVideoAsset(row))
      .filter((video): video is RankedYouTubeVideoAsset => video !== null);

    return {
      videos,
      configured: true,
      error: null,
      totalCount: videos.length,
    };
  } catch (error) {
    return {
      videos: [],
      configured: true,
      error:
        error instanceof Error
          ? `No he podido leer la caché MTV: ${error.message}`
          : "No he podido leer la caché MTV.",
      totalCount: 0,
    };
  }
}

export async function readYouTubeMatchCache(
  cacheKey: string,
): Promise<YouTubeMatchCacheLookupResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return { status: "miss" };
  }

  try {
    const { data, error } = await supabase
      .from("youtube_video_matches")
      .select(
        "cache_key, matched_query, has_match, video_id, title, channel_title, description, thumbnail_url, external_url, embed_url, view_count, rating",
      )
      .eq("cache_key", cacheKey)
      .maybeSingle<YouTubeVideoMatchCacheRow>();

    if (error || !data) {
      return { status: "miss" };
    }

    return {
      status: "hit",
      video: mapRowToVideoAsset(data),
    };
  } catch {
    return { status: "miss" };
  }
}

export async function readYouTubeMatchCacheTrackMetadata(cacheKeys: string[]) {
  const supabase = createSupabaseServerClient();
  const normalizedCacheKeys = [
    ...new Set(cacheKeys.map((key) => key.trim()).filter(Boolean)),
  ];

  if (!supabase || normalizedCacheKeys.length === 0) {
    return {} as Record<string, { cached: boolean; rating: YouTubeMatchRating }>;
  }

  try {
    const { data, error } = await supabase
      .from("youtube_video_matches")
      .select("cache_key, rating")
      .in("cache_key", normalizedCacheKeys)
      .returns<YouTubeVideoMatchCacheSummaryRow[]>();

    if (error || !data) {
      return {} as Record<string, { cached: boolean; rating: YouTubeMatchRating }>;
    }

    const summaryByKey = new Map(
      data
        .map((row) => {
          const cacheKey = row.cache_key.trim();

          if (!cacheKey) {
            return null;
          }

          return [
            cacheKey,
            {
              cached: true,
              rating: normalizeMatchRating(row.rating),
            },
          ] as const;
        })
        .filter(
          (
            entry,
          ): entry is readonly [
            string,
            { cached: true; rating: YouTubeMatchRating },
          ] => entry !== null,
        ),
    );

    return normalizedCacheKeys.reduce<
      Record<string, { cached: boolean; rating: YouTubeMatchRating }>
    >((statusMap, cacheKey) => {
      statusMap[cacheKey] = summaryByKey.get(cacheKey) ?? {
        cached: false,
        rating: 0,
      };
      return statusMap;
    }, {});
  } catch {
    return {} as Record<string, { cached: boolean; rating: YouTubeMatchRating }>;
  }
}

export async function upsertYouTubeMatchCache({
  cacheKey,
  trackName,
  artistsLabel,
  albumName,
  albumReleaseYear,
  matchedQuery,
  video,
}: UpsertYouTubeVideoMatchCacheInput): Promise<UpsertYouTubeVideoMatchCacheResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para guardar la caché de YouTube.",
    };
  }

  try {
    const normalizedCacheKey = cacheKey.trim();
    const normalizedTrackName = trackName.trim();
    const normalizedArtistsLabel = artistsLabel.trim();
    const basePayload = {
      cache_key: normalizedCacheKey,
      track_name: normalizedTrackName,
      artists_label: normalizedArtistsLabel,
      album_name: normalizeNullableValue(albumName),
      album_release_year: normalizeNullableValue(albumReleaseYear),
      matched_query: matchedQuery.trim(),
      has_match: Boolean(video),
      video_id: normalizeNullableValue(video?.id),
      title: normalizeNullableValue(video?.title),
      channel_title: normalizeNullableValue(video?.channelTitle),
      description: normalizeNullableValue(video?.description),
      thumbnail_url: normalizeNullableValue(video?.thumbnailUrl),
      external_url: normalizeNullableValue(video?.externalUrl),
      embed_url: normalizeNullableValue(video?.embedUrl),
      view_count: video?.viewCount ?? null,
    };
    const { data: existingRow, error: existingRowError } = await supabase
      .from("youtube_video_matches")
      .select("cache_key")
      .eq("cache_key", normalizedCacheKey)
      .maybeSingle<{ cache_key: string }>();

    if (existingRowError) {
      return {
        ok: false,
        error: `No he podido preparar la caché de YouTube: ${existingRowError.message}`,
      };
    }

    const { error } = existingRow
      ? await supabase
          .from("youtube_video_matches")
          .update(basePayload)
          .eq("cache_key", normalizedCacheKey)
      : await supabase.from("youtube_video_matches").insert({
          ...basePayload,
          rating: 0,
        });

    if (error) {
      return {
        ok: false,
        error: `No he podido guardar la caché de YouTube: ${error.message}`,
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "No he podido guardar la caché de YouTube.",
    };
  }
}

export async function upsertYouTubeMatchRating({
  cacheKey,
  trackName,
  artistsLabel,
  albumName,
  albumReleaseYear,
  rating,
}: UpsertYouTubeMatchRatingInput): Promise<UpsertYouTubeVideoMatchCacheResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para guardar la puntuación del vídeo.",
    };
  }

  try {
    const normalizedCacheKey = cacheKey.trim();
    const normalizedTrackName = trackName.trim();
    const normalizedArtistsLabel = artistsLabel.trim();
    const normalizedRating = normalizeMatchRating(rating);
    const { data: existingRow, error: existingRowError } = await supabase
      .from("youtube_video_matches")
      .select("cache_key")
      .eq("cache_key", normalizedCacheKey)
      .maybeSingle<{ cache_key: string }>();

    if (existingRowError) {
      return {
        ok: false,
        error: `No he podido preparar la puntuación del vídeo: ${existingRowError.message}`,
      };
    }

    const { error } = existingRow
      ? await supabase
          .from("youtube_video_matches")
          .update({
            rating: normalizedRating,
          })
          .eq("cache_key", normalizedCacheKey)
      : await supabase.from("youtube_video_matches").insert({
          cache_key: normalizedCacheKey,
          track_name: normalizedTrackName,
          artists_label: normalizedArtistsLabel,
          album_name: normalizeNullableValue(albumName),
          album_release_year: normalizeNullableValue(albumReleaseYear),
          matched_query: null,
          has_match: false,
          rating: normalizedRating,
        });

    if (error) {
      return {
        ok: false,
        error: `No he podido guardar la puntuación del vídeo: ${error.message}`,
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "No he podido guardar la puntuación del vídeo.",
    };
  }
}

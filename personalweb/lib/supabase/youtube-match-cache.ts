import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { YouTubeMatchedVideoAsset } from "@/lib/youtube-types";

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
        "cache_key, matched_query, has_match, video_id, title, channel_title, description, thumbnail_url, external_url, embed_url, view_count",
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
    const { error } = await supabase.from("youtube_video_matches").upsert(
      {
        cache_key: cacheKey,
        track_name: trackName.trim(),
        artists_label: artistsLabel.trim(),
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
      },
      {
        onConflict: "cache_key",
      },
    );

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

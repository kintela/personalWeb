import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  SpotifyPlaylistAsset,
  SpotifyPlaylistTrackAsset,
  SpotifyPlaylistTrackSearchHitAsset,
  SpotifyTopicMatchAsset,
} from "@/lib/spotify-types";
import {
  buildSpotifyHighlightedPlaylistUrl,
  buildSpotifyTrackExternalUrl,
  canonicalizeSpotifyTrackNameForMatch,
  formatSpotifyDurationLabel,
  normalizeSpotifyMatchValue,
} from "@/lib/spotify-match";

type SpotifyPlaylistCacheRow = {
  id: number | string;
  spotify_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  external_url: string;
  owner_spotify_id: string;
  owner_name: string | null;
  track_count: number | string | null;
  visibility_label: string | null;
  collaborative: boolean | null;
  snapshot_id: string;
  is_active: boolean | null;
  last_synced_at: string | null;
};

type SpotifyPlaylistTrackCacheRow = {
  id: number | string;
  playlist_cache_id: number | string;
  spotify_track_id: string | null;
  position: number | string;
  name: string;
  artists_label: string;
  album_name: string | null;
  album_release_date: string | null;
  language_code: string | null;
  duration_ms: number | string | null;
  normalized_track_name: string;
  canonical_track_name: string;
};

type UpsertSpotifyPlaylistCacheInput = {
  spotifyId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string;
  ownerSpotifyId: string;
  ownerName: string | null;
  trackCount: number;
  visibilityLabel: string | null;
  collaborative: boolean;
  snapshotId: string;
};

type ReplaceSpotifyPlaylistTracksInput = {
  playlistCacheId: number;
  tracks: Array<{
    spotifyTrackId: string | null;
    position: number;
    name: string;
    artistsLabel: string;
    albumName: string | null;
    albumReleaseDate: string | null;
    languageCode?: string | null;
    durationMs: number | null;
    isLocal: boolean;
    normalizedTrackName: string;
    canonicalTrackName: string;
  }>;
};

export type SpotifyCachedPlaylistSyncState = {
  id: number;
  spotifyId: string;
  snapshotId: string;
  isActive: boolean;
  lastSyncedAt: string | null;
};

export type SpotifyPlaylistCacheSyncGap = {
  playlistCacheId: number;
  spotifyId: string;
  name: string;
  expectedTrackCount: number;
  cachedTrackCount: number;
  missingTrackCount: number;
  lastSyncedAt: string | null;
};

export type SpotifyAdminPlaylistListItem = {
  playlistCacheId: number;
  spotifyId: string;
  name: string;
  trackCount: number;
  cachedTrackCount: number;
  lastSyncedAt: string | null;
};

export type SpotifyAdminDuplicateTrackItem = {
  duplicateKey: string;
  spotifyTrackId: string | null;
  name: string;
  artistsLabel: string;
  occurrences: number;
  positions: number[];
};

export type SpotifyAdminDuplicatePlaylistItem = {
  playlistCacheId: number;
  spotifyId: string;
  name: string;
  duplicateTrackCount: number;
  duplicateOccurrenceCount: number;
  tracks: SpotifyAdminDuplicateTrackItem[];
};

type SpotifyCacheMutationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

type UpsertSpotifyPlaylistCacheResult =
  | {
      ok: true;
      playlistCacheIdBySpotifyId: Map<string, number>;
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

function trimNullableValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function parseInteger(value: number | string | null | undefined) {
  const normalizedValue =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

function parseNullableInteger(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function escapeLikeValue(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function mapPlaylistCacheRowToAsset(
  row: SpotifyPlaylistCacheRow,
): SpotifyPlaylistAsset {
  return {
    id: row.spotify_id.trim(),
    name: row.name.trim(),
    description: trimNullableValue(row.description),
    imageUrl: trimNullableValue(row.image_url),
    externalUrl: row.external_url.trim(),
    embedUrl: `https://open.spotify.com/embed/playlist/${row.spotify_id.trim()}?utm_source=generator`,
    ownerName: trimNullableValue(row.owner_name) ?? "Spotify",
    trackCount: Math.max(0, parseInteger(row.track_count)),
    visibilityLabel: trimNullableValue(row.visibility_label) ?? "Pública",
    collaborative: Boolean(row.collaborative),
  } satisfies SpotifyPlaylistAsset;
}

function mapTrackCacheRowToAsset(
  row: SpotifyPlaylistTrackCacheRow,
): SpotifyPlaylistTrackAsset {
  const durationMs = parseNullableInteger(row.duration_ms);
  const position = Math.max(1, parseInteger(row.position));
  const spotifyTrackId = trimNullableValue(row.spotify_track_id);
  const fallbackId = `${position}-${row.name
    .trim()
    .toLocaleLowerCase("es-ES")
    .replace(/\s+/g, "-")}`;

  return {
    id: spotifyTrackId ?? fallbackId,
    position,
    name: row.name.trim(),
    artistsLabel: row.artists_label.trim(),
    albumName: trimNullableValue(row.album_name),
    albumReleaseDate: trimNullableValue(row.album_release_date),
    languageCode: trimNullableValue(row.language_code),
    durationMs,
    durationLabel: formatSpotifyDurationLabel(durationMs),
    youtubeCacheStatus: "uncached",
    rating: 0,
  } satisfies SpotifyPlaylistTrackAsset;
}

async function readAllSpotifyCachedTrackPlaylistIds(supabase: SupabaseClient) {
  const playlistCacheIds: number[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("spotify_playlist_tracks_cache")
      .select("playlist_cache_id")
      .range(from, from + pageSize - 1)
      .returns<Array<{ playlist_cache_id: number | string }>>();

    if (error) {
      return {
        ok: false,
        error,
        playlistCacheIds,
      } as const;
    }

    const rows = data ?? [];

    playlistCacheIds.push(
      ...rows
        .map((row) => parseInteger(row.playlist_cache_id))
        .filter((playlistCacheId) => playlistCacheId > 0),
    );

    if (rows.length < pageSize) {
      return {
        ok: true,
        playlistCacheIds,
      } as const;
    }

    from += pageSize;
  }
}

export async function getSpotifyCacheSummary() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const [
    { data: activePlaylists, error: playlistsError },
    trackCountByPlaylistCacheId,
    { data, error: latestError },
  ] =
    await Promise.all([
      supabase
        .from("spotify_playlists_cache")
        .select("id, track_count")
        .eq("is_active", true),
      readSpotifyCachedPlaylistTrackCounts(),
      supabase
        .from("spotify_playlists_cache")
        .select("last_synced_at")
        .eq("is_active", true)
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ last_synced_at: string | null }>(),
    ]);

  if (playlistsError || latestError) {
    return null;
  }

  const playlists = (activePlaylists ?? []).map((playlist) => ({
    id: parseInteger(playlist.id),
    expectedTrackCount: Math.max(0, parseInteger(playlist.track_count)),
  }));
  const activePlaylistIds = new Set(playlists.map((playlist) => playlist.id));
  const activePlaylistCountWithTracks = playlists.filter(
    (playlist) => (trackCountByPlaylistCacheId.get(playlist.id) ?? 0) > 0,
  ).length;
  const activePlaylistCountFullySynced = playlists.filter(
    (playlist) =>
      (trackCountByPlaylistCacheId.get(playlist.id) ?? 0) >=
      playlist.expectedTrackCount,
  ).length;
  const incompletePlaylistCount = playlists.filter(
    (playlist) =>
      (trackCountByPlaylistCacheId.get(playlist.id) ?? 0) <
      playlist.expectedTrackCount,
  ).length;
  const cachedTrackCount = [...trackCountByPlaylistCacheId.entries()].reduce(
    (total, [playlistCacheId, trackCount]) =>
      activePlaylistIds.has(playlistCacheId) ? total + trackCount : total,
    0,
  );

  return {
    activePlaylistCount: activePlaylistIds.size,
    activePlaylistCountWithTracks,
    activePlaylistCountFullySynced,
    incompletePlaylistCount,
    cachedTrackCount,
    latestSyncAt: data?.last_synced_at ?? null,
  };
}

export async function readSpotifyCachedPlaylistSyncGaps() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [] as SpotifyPlaylistCacheSyncGap[];
  }

  const [{ data: playlists, error: playlistsError }, trackCounts] =
    await Promise.all([
      supabase
        .from("spotify_playlists_cache")
        .select("id, spotify_id, name, track_count, last_synced_at")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .returns<
          Array<{
            id: number | string;
            spotify_id: string;
            name: string;
            track_count: number | string | null;
            last_synced_at: string | null;
          }>
        >(),
      readSpotifyCachedPlaylistTrackCounts(),
    ]);

  if (playlistsError) {
    return [] as SpotifyPlaylistCacheSyncGap[];
  }

  return (playlists ?? [])
    .map((playlist) => {
      const playlistCacheId = parseInteger(playlist.id);
      const expectedTrackCount = Math.max(0, parseInteger(playlist.track_count));
      const cachedTrackCount = trackCounts.get(playlistCacheId) ?? 0;

      return {
        playlistCacheId,
        spotifyId: playlist.spotify_id.trim(),
        name: playlist.name.trim(),
        expectedTrackCount,
        cachedTrackCount,
        missingTrackCount: Math.max(expectedTrackCount - cachedTrackCount, 0),
        lastSyncedAt: playlist.last_synced_at,
      } satisfies SpotifyPlaylistCacheSyncGap;
    })
    .filter((playlist) => playlist.missingTrackCount > 0)
    .sort((left, right) => {
      if (right.missingTrackCount !== left.missingTrackCount) {
        return right.missingTrackCount - left.missingTrackCount;
      }

      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });
}

export async function readSpotifyAdminPlaylistList() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [] as SpotifyAdminPlaylistListItem[];
  }

  const [{ data: playlists, error: playlistsError }, trackCounts] =
    await Promise.all([
      supabase
        .from("spotify_playlists_cache")
        .select("id, spotify_id, name, track_count, last_synced_at")
        .eq("is_active", true)
        .returns<
          Array<{
            id: number | string;
            spotify_id: string;
            name: string;
            track_count: number | string | null;
            last_synced_at: string | null;
          }>
        >(),
      readSpotifyCachedPlaylistTrackCounts(),
    ]);

  if (playlistsError) {
    return [] as SpotifyAdminPlaylistListItem[];
  }

  return (playlists ?? [])
    .map((playlist) => {
      const playlistCacheId = parseInteger(playlist.id);

      return {
        playlistCacheId,
        spotifyId: playlist.spotify_id.trim(),
        name: playlist.name.trim(),
        trackCount: Math.max(0, parseInteger(playlist.track_count)),
        cachedTrackCount: trackCounts.get(playlistCacheId) ?? 0,
        lastSyncedAt: playlist.last_synced_at,
      } satisfies SpotifyAdminPlaylistListItem;
    })
    .sort((left, right) => {
      if (right.trackCount !== left.trackCount) {
        return right.trackCount - left.trackCount;
      }

      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });
}

export async function readSpotifyAdminDuplicatePlaylists() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [] as SpotifyAdminDuplicatePlaylistItem[];
  }

  const [{ data: playlists, error: playlistsError }, { data: tracks, error: tracksError }] =
    await Promise.all([
      supabase
        .from("spotify_playlists_cache")
        .select("id, spotify_id, name")
        .eq("is_active", true)
        .returns<
          Array<{
            id: number | string;
            spotify_id: string;
            name: string;
          }>
        >(),
      supabase
        .from("spotify_playlist_tracks_cache")
        .select(
          "playlist_cache_id, spotify_track_id, position, name, artists_label, canonical_track_name",
        )
        .returns<
          Array<{
            playlist_cache_id: number | string;
            spotify_track_id: string | null;
            position: number | string;
            name: string;
            artists_label: string;
            canonical_track_name: string;
          }>
        >(),
    ]);

  if (playlistsError || tracksError || !playlists?.length || !tracks?.length) {
    return [] as SpotifyAdminDuplicatePlaylistItem[];
  }

  const activePlaylistIds = new Set(
    playlists.map((playlist) => parseInteger(playlist.id)).filter((id) => id > 0),
  );
  const playlistMetaById = new Map(
    playlists.map((playlist) => [
      parseInteger(playlist.id),
      {
        spotifyId: playlist.spotify_id.trim(),
        name: playlist.name.trim(),
      },
    ]),
  );
  const duplicateTracksByPlaylistId = new Map<
    number,
    Map<string, SpotifyAdminDuplicateTrackItem>
  >();

  for (const track of tracks) {
    const playlistCacheId = parseInteger(track.playlist_cache_id);

    if (!activePlaylistIds.has(playlistCacheId)) {
      continue;
    }

    const spotifyTrackId = trimNullableValue(track.spotify_track_id);
    const canonicalTrackName = track.canonical_track_name.trim();
    const artistsLabel = track.artists_label.trim();
    const duplicateKey = spotifyTrackId
      ? `spotify:${spotifyTrackId}`
      : `fallback:${canonicalTrackName}::${artistsLabel.toLocaleLowerCase("es-ES")}`;

    let playlistTracks = duplicateTracksByPlaylistId.get(playlistCacheId);

    if (!playlistTracks) {
      playlistTracks = new Map<string, SpotifyAdminDuplicateTrackItem>();
      duplicateTracksByPlaylistId.set(playlistCacheId, playlistTracks);
    }

    const existingTrack = playlistTracks.get(duplicateKey);
    const position = parseInteger(track.position);

    if (existingTrack) {
      existingTrack.occurrences += 1;
      existingTrack.positions.push(position);
      continue;
    }

    playlistTracks.set(duplicateKey, {
      duplicateKey,
      spotifyTrackId,
      name: track.name.trim(),
      artistsLabel,
      occurrences: 1,
      positions: [position],
    });
  }

  return [...duplicateTracksByPlaylistId.entries()]
    .map(([playlistCacheId, playlistTracks]) => {
      const playlistMeta = playlistMetaById.get(playlistCacheId);

      if (!playlistMeta) {
        return null;
      }

      const duplicateTracks = [...playlistTracks.values()]
        .filter((track) => track.occurrences > 1)
        .map((track) => ({
          ...track,
          positions: [...track.positions].sort((left, right) => left - right),
        }))
        .sort((left, right) => {
          if (right.occurrences !== left.occurrences) {
            return right.occurrences - left.occurrences;
          }

          return left.positions[0] - right.positions[0];
        });

      if (duplicateTracks.length === 0) {
        return null;
      }

      return {
        playlistCacheId,
        spotifyId: playlistMeta.spotifyId,
        name: playlistMeta.name,
        duplicateTrackCount: duplicateTracks.length,
        duplicateOccurrenceCount: duplicateTracks.reduce(
          (total, track) => total + track.occurrences,
          0,
        ),
        tracks: duplicateTracks,
      } satisfies SpotifyAdminDuplicatePlaylistItem;
    })
    .filter((playlist): playlist is SpotifyAdminDuplicatePlaylistItem => Boolean(playlist))
    .sort((left, right) => {
      if (right.duplicateTrackCount !== left.duplicateTrackCount) {
        return right.duplicateTrackCount - left.duplicateTrackCount;
      }

      if (right.duplicateOccurrenceCount !== left.duplicateOccurrenceCount) {
        return right.duplicateOccurrenceCount - left.duplicateOccurrenceCount;
      }

      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });
}

export async function readSpotifyCachedPlaylists() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [] as SpotifyPlaylistAsset[];
  }

  const { data, error } = await supabase
    .from("spotify_playlists_cache")
    .select(
      "id, spotify_id, name, description, image_url, external_url, owner_spotify_id, owner_name, track_count, visibility_label, collaborative, snapshot_id, is_active, last_synced_at",
    )
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<SpotifyPlaylistCacheRow[]>();

  if (error) {
    return [] as SpotifyPlaylistAsset[];
  }

  return (data ?? []).map((row) => mapPlaylistCacheRowToAsset(row));
}

export async function readSpotifyCachedPlaylistSyncState() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [] as SpotifyCachedPlaylistSyncState[];
  }

  const { data, error } = await supabase
    .from("spotify_playlists_cache")
    .select("id, spotify_id, snapshot_id, is_active, last_synced_at")
    .returns<SpotifyPlaylistCacheRow[]>();

  if (error) {
    return [] as SpotifyCachedPlaylistSyncState[];
  }

  return (data ?? []).map((row) => ({
    id: parseInteger(row.id),
    spotifyId: row.spotify_id.trim(),
    snapshotId: row.snapshot_id.trim(),
    isActive: Boolean(row.is_active),
    lastSyncedAt: row.last_synced_at,
  }));
}

export async function readSpotifyCachedPlaylistTrackCounts() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return new Map<number, number>();
  }

  const result = await readAllSpotifyCachedTrackPlaylistIds(supabase);

  if (!result.ok) {
    return new Map<number, number>();
  }

  const trackCountByPlaylistCacheId = new Map<number, number>();

  for (const playlistCacheId of result.playlistCacheIds) {
    trackCountByPlaylistCacheId.set(
      playlistCacheId,
      (trackCountByPlaylistCacheId.get(playlistCacheId) ?? 0) + 1,
    );
  }

  return trackCountByPlaylistCacheId;
}

export async function upsertSpotifyCachedPlaylists(
  playlists: UpsertSpotifyPlaylistCacheInput[],
): Promise<UpsertSpotifyPlaylistCacheResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para escribir la caché de Spotify.",
    };
  }

  const rows = playlists.map((playlist) => ({
    spotify_id: playlist.spotifyId.trim(),
    name: playlist.name.trim(),
    description: trimNullableValue(playlist.description),
    image_url: trimNullableValue(playlist.imageUrl),
    external_url: playlist.externalUrl.trim(),
    owner_spotify_id: playlist.ownerSpotifyId.trim(),
    owner_name: trimNullableValue(playlist.ownerName),
    track_count: Math.max(0, playlist.trackCount),
    visibility_label: trimNullableValue(playlist.visibilityLabel),
    collaborative: playlist.collaborative,
    snapshot_id: playlist.snapshotId.trim(),
    is_active: true,
    last_synced_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("spotify_playlists_cache")
    .upsert(rows, { onConflict: "spotify_id" })
    .select("id, spotify_id")
    .returns<Array<{ id: number | string; spotify_id: string }>>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    playlistCacheIdBySpotifyId: new Map(
      (data ?? []).map((row) => [row.spotify_id.trim(), parseInteger(row.id)]),
    ),
  };
}

export async function markMissingSpotifyCachedPlaylistsInactive(
  activeSpotifyIds: string[],
): Promise<SpotifyCacheMutationResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para actualizar la caché de Spotify.",
    };
  }

  const normalizedActiveSpotifyIds = new Set(
    activeSpotifyIds.map((spotifyId) => spotifyId.trim()).filter(Boolean),
  );
  const { data, error } = await supabase
    .from("spotify_playlists_cache")
    .select("id, spotify_id")
    .eq("is_active", true)
    .returns<Array<{ id: number | string; spotify_id: string }>>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  const playlistIdsToDeactivate = (data ?? [])
    .filter((row) => !normalizedActiveSpotifyIds.has(row.spotify_id.trim()))
    .map((row) => parseInteger(row.id))
    .filter((id) => id > 0);

  if (playlistIdsToDeactivate.length === 0) {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from("spotify_playlists_cache")
    .update({
      is_active: false,
      last_synced_at: new Date().toISOString(),
    })
    .in("id", playlistIdsToDeactivate);

  if (updateError) {
    return {
      ok: false,
      error: updateError.message,
    };
  }

  return { ok: true };
}

export async function replaceSpotifyCachedPlaylistTracks({
  playlistCacheId,
  tracks,
}: ReplaceSpotifyPlaylistTracksInput): Promise<SpotifyCacheMutationResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para guardar los temas de Spotify.",
    };
  }

  const normalizedPlaylistCacheId = Math.max(0, playlistCacheId);

  if (!normalizedPlaylistCacheId) {
    return {
      ok: false,
      error: "Falta el identificador interno de la playlist cacheada.",
    };
  }

  const payload = tracks.map((track) => ({
    spotify_track_id: trimNullableValue(track.spotifyTrackId),
    position: Math.max(1, track.position),
    name: track.name.trim(),
    artists_label: track.artistsLabel.trim(),
    album_name: trimNullableValue(track.albumName),
    album_release_date: trimNullableValue(track.albumReleaseDate),
    language_code: trimNullableValue(track.languageCode),
    duration_ms: track.durationMs,
    is_local: track.isLocal,
    normalized_track_name: track.normalizedTrackName.trim(),
    canonical_track_name: track.canonicalTrackName.trim(),
  }));
  const { error } = await supabase.rpc("sync_spotify_playlist_tracks_cache", {
    target_playlist_cache_id: normalizedPlaylistCacheId,
    target_tracks: payload,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return { ok: true };
}

export async function readSpotifyCachedPlaylistTracks(playlistSpotifyId: string) {
  const supabase = createSupabaseServerClient();
  const normalizedPlaylistSpotifyId = playlistSpotifyId.trim();

  if (!supabase || !normalizedPlaylistSpotifyId) {
    return [] as SpotifyPlaylistTrackAsset[];
  }

  const { data: playlistRow, error: playlistError } = await supabase
    .from("spotify_playlists_cache")
    .select("id")
    .eq("spotify_id", normalizedPlaylistSpotifyId)
    .eq("is_active", true)
    .maybeSingle<{ id: number | string }>();

  if (playlistError || !playlistRow) {
    return [] as SpotifyPlaylistTrackAsset[];
  }

  const { data, error } = await supabase
    .from("spotify_playlist_tracks_cache")
    .select(
      "id, playlist_cache_id, spotify_track_id, position, name, artists_label, album_name, album_release_date, language_code, duration_ms, normalized_track_name, canonical_track_name",
    )
    .eq("playlist_cache_id", parseInteger(playlistRow.id))
    .order("position", { ascending: true })
    .returns<SpotifyPlaylistTrackCacheRow[]>();

  if (error) {
    return [] as SpotifyPlaylistTrackAsset[];
  }

  return (data ?? []).map((row) => mapTrackCacheRowToAsset(row));
}

export async function updateSpotifyCachedPlaylistTrackLanguage({
  playlistSpotifyId,
  position,
  languageCode,
}: {
  playlistSpotifyId: string;
  position: number;
  languageCode: string | null;
}): Promise<{ ok: true; languageCode: string | null } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const normalizedPlaylistSpotifyId = playlistSpotifyId.trim();
  const normalizedPosition = Math.max(0, Math.trunc(position));
  const normalizedLanguageCode = trimNullableValue(languageCode)?.toLocaleLowerCase(
    "es-ES",
  ) ?? null;

  if (!supabase) {
    return {
      ok: false,
      error: "Falta configurar Supabase para guardar el idioma del tema.",
    };
  }

  if (!normalizedPlaylistSpotifyId || normalizedPosition <= 0) {
    return {
      ok: false,
      error: "Faltan datos para localizar la canción cacheada.",
    };
  }

  if (
    normalizedLanguageCode !== null &&
    !/^[a-z]{2}$/u.test(normalizedLanguageCode)
  ) {
    return {
      ok: false,
      error: "El idioma debe usar un código ISO de dos letras.",
    };
  }

  const { data: playlistRow, error: playlistError } = await supabase
    .from("spotify_playlists_cache")
    .select("id")
    .eq("spotify_id", normalizedPlaylistSpotifyId)
    .maybeSingle<{ id: number | string }>();

  if (playlistError || !playlistRow) {
    return {
      ok: false,
      error: "No he encontrado la playlist cacheada en Supabase.",
    };
  }

  const { data: updatedTrack, error: updateError } = await supabase
    .from("spotify_playlist_tracks_cache")
    .update({
      language_code: normalizedLanguageCode,
    })
    .eq("playlist_cache_id", parseInteger(playlistRow.id))
    .eq("position", normalizedPosition)
    .select("language_code")
    .maybeSingle<{ language_code: string | null }>();

  if (updateError) {
    return {
      ok: false,
      error: updateError.message,
    };
  }

  if (!updatedTrack) {
    return {
      ok: false,
      error: "No he encontrado la canción cacheada para actualizar su idioma.",
    };
  }

  return {
    ok: true,
    languageCode: trimNullableValue(updatedTrack.language_code),
  };
}

export async function searchSpotifyCachedPlaylistsByTrackQuery(query: string) {
  const supabase = createSupabaseServerClient();
  const normalizedQuery = normalizeSpotifyMatchValue(query);
  const canonicalQuery = canonicalizeSpotifyTrackNameForMatch(query);

  if (!supabase || !normalizedQuery) {
    return [] as SpotifyPlaylistTrackSearchHitAsset[];
  }

  const { data: playlists, error: playlistsError } = await supabase
    .from("spotify_playlists_cache")
    .select("id, spotify_id, name")
    .eq("is_active", true)
    .returns<Array<{ id: number | string; spotify_id: string; name: string }>>();

  if (playlistsError || !playlists?.length) {
    return [] as SpotifyPlaylistTrackSearchHitAsset[];
  }

  const activePlaylistIds = playlists.map((playlist) => parseInteger(playlist.id));
  const playlistById = new Map(
    playlists.map((playlist) => [
      parseInteger(playlist.id),
      {
        spotifyId: playlist.spotify_id.trim(),
        name: playlist.name.trim(),
      },
    ]),
  );
  const playlistNameBySpotifyId = new Map(
    playlists.map((playlist) => [
      playlist.spotify_id.trim(),
      playlist.name.trim(),
    ]),
  );
  const escapedNormalizedQuery = escapeLikeValue(normalizedQuery);
  const escapedCanonicalQuery = escapeLikeValue(canonicalQuery || normalizedQuery);
  const { data: tracks, error: tracksError } = await supabase
    .from("spotify_playlist_tracks_cache")
    .select("playlist_cache_id, position, name, artists_label")
    .in("playlist_cache_id", activePlaylistIds)
    .or(
      `normalized_track_name.ilike.%${escapedNormalizedQuery}%,canonical_track_name.ilike.%${escapedCanonicalQuery}%`,
    )
    .order("position", { ascending: true })
    .returns<
      Array<{
        playlist_cache_id: number | string;
        position: number | string;
        name: string;
        artists_label: string;
      }>
    >();

  if (tracksError || !tracks?.length) {
    return [] as SpotifyPlaylistTrackSearchHitAsset[];
  }

  const firstHitByPlaylistId = new Map<
    number,
    SpotifyPlaylistTrackSearchHitAsset
  >();

  for (const track of tracks) {
    const playlistCacheId = parseInteger(track.playlist_cache_id);

    if (!playlistById.has(playlistCacheId) || firstHitByPlaylistId.has(playlistCacheId)) {
      continue;
    }

    const playlist = playlistById.get(playlistCacheId);

    if (!playlist) {
      continue;
    }

    firstHitByPlaylistId.set(playlistCacheId, {
      playlistId: playlist.spotifyId,
      matchedTrack: {
        trackName: track.name.trim(),
        trackArtistsLabel: track.artists_label.trim(),
      },
    });
  }

  return [...firstHitByPlaylistId.values()].sort((left, right) =>
    (playlistNameBySpotifyId.get(left.playlistId) ?? left.playlistId).localeCompare(
      playlistNameBySpotifyId.get(right.playlistId) ?? right.playlistId,
      "es",
      { sensitivity: "base" },
    ),
  );
}

export async function findSpotifyCachedTopicMatch({
  topicName,
  groupName,
}: {
  topicName: string;
  groupName: string;
}) {
  const supabase = createSupabaseServerClient();
  const normalizedTopicName = normalizeSpotifyMatchValue(topicName);
  const canonicalTopicName = canonicalizeSpotifyTrackNameForMatch(topicName);
  const normalizedGroupName = normalizeSpotifyMatchValue(groupName);

  if (!supabase || !normalizedTopicName || !normalizedGroupName) {
    return null;
  }

  const { data: playlists, error: playlistsError } = await supabase
    .from("spotify_playlists_cache")
    .select("id, spotify_id, name, external_url")
    .eq("is_active", true)
    .returns<
      Array<{
        id: number | string;
        spotify_id: string;
        name: string;
        external_url: string;
      }>
    >();

  if (playlistsError || !playlists?.length) {
    return null;
  }

  const activePlaylistIds = playlists.map((playlist) => parseInteger(playlist.id));
  const playlistById = new Map(
    playlists.map((playlist) => [
      parseInteger(playlist.id),
      {
        spotifyId: playlist.spotify_id.trim(),
        playlistName: playlist.name.trim(),
        externalUrl: playlist.external_url.trim(),
      },
    ]),
  );
  const escapedNormalizedTopicName = escapeLikeValue(normalizedTopicName);
  const escapedCanonicalTopicName = escapeLikeValue(
    canonicalTopicName || normalizedTopicName,
  );
  const { data: tracks, error: tracksError } = await supabase
    .from("spotify_playlist_tracks_cache")
    .select(
      "playlist_cache_id, spotify_track_id, position, name, artists_label, normalized_track_name, canonical_track_name",
    )
    .in("playlist_cache_id", activePlaylistIds)
    .or(
      `normalized_track_name.eq.${escapedNormalizedTopicName},canonical_track_name.eq.${escapedCanonicalTopicName}`,
    )
    .order("position", { ascending: true })
    .returns<SpotifyPlaylistTrackCacheRow[]>();

  if (tracksError || !tracks?.length) {
    return null;
  }

  const match =
    tracks.find((track) => {
      const normalizedArtistsLabel = normalizeSpotifyMatchValue(track.artists_label);

      return (
        normalizedArtistsLabel === normalizedGroupName ||
        normalizedArtistsLabel.includes(normalizedGroupName) ||
        normalizedGroupName.includes(normalizedArtistsLabel)
      );
    }) ?? null;

  if (!match) {
    return null;
  }

  const playlist = playlistById.get(parseInteger(match.playlist_cache_id));
  const trackId = trimNullableValue(match.spotify_track_id);

  if (!playlist || !trackId) {
    return null;
  }

  return {
    playlistId: playlist.spotifyId,
    playlistName: playlist.playlistName,
    playlistExternalUrl: playlist.externalUrl,
    highlightedPlaylistUrl: buildSpotifyHighlightedPlaylistUrl(
      playlist.externalUrl,
      trackId,
    ),
    trackId,
    trackName: match.name.trim(),
    trackArtistsLabel: match.artists_label.trim(),
    trackExternalUrl: buildSpotifyTrackExternalUrl(trackId),
  } satisfies SpotifyTopicMatchAsset;
}

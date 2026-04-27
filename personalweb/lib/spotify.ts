import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import type {
  SpotifyPlaylistAsset,
  SpotifyPlaylistListResult,
  SpotifyQuickAccessAsset,
  SpotifyPlaylistTrackAsset,
  SpotifyPlaylistTrackSearchHitAsset,
  SpotifyPlaylistTrackSearchPreviewAsset,
  SpotifyTopicMatchAsset,
} from "@/lib/spotify-types";
import {
  buildSpotifyHighlightedPlaylistUrl,
  buildSpotifyTrackExternalUrl,
  canonicalizeSpotifyTrackNameForMatch,
  normalizeSpotifyMatchValue,
} from "@/lib/spotify-match";
import {
  findSpotifyCachedTopicMatch,
  getSpotifyCacheSummary,
  markMissingSpotifyCachedPlaylistsInactive,
  readSpotifyCachedPlaylistTrackCounts,
  readSpotifyCachedPlaylistSyncState,
  readSpotifyCachedPlaylistTracks,
  readSpotifyCachedPlaylists,
  replaceSpotifyCachedPlaylistTracks,
  searchSpotifyCachedPlaylistsByTrackQuery,
  upsertSpotifyCachedPlaylists,
} from "@/lib/supabase/spotify-cache";
import { readYouTubeMatchCacheTrackMetadata } from "@/lib/supabase/youtube-match-cache";
import { getYouTubeSongVideoCacheKey } from "@/lib/youtube";

const SPOTIFY_ACCOUNTS_BASE_URL = "https://accounts.spotify.com";
const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_SCOPE_LIST = [
  "playlist-read-private",
  "playlist-read-collaborative",
] as const;
const SPOTIFY_STATE_COOKIE_NAME = "personalweb-spotify-auth-state";
const SPOTIFY_STATE_COOKIE_MAX_AGE = 60 * 10;
const SPOTIFY_LOGIN_PATH = "/api/spotify/login";
const SPOTIFY_CALLBACK_PATH = "/api/spotify/callback";
const KINTELA_SPOTIFY_ARTIST_ID = "1wL3xbiQUvV9cwYEjN70rB";
const DESGARRAMANTAS_SPOTIFY_ARTIST_ID = "7cpd2HqTblNj4YFdU6R0RT";
const SPOTIFY_ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;
const SPOTIFY_PLAYLIST_LIST_CACHE_TTL_MS = 2 * 60_000;
const SPOTIFY_PLAYLIST_TRACK_INDEX_CACHE_TTL_MS = 10 * 60_000;
const SPOTIFY_PLAYLIST_TRACK_QUERY_CACHE_TTL_MS = 10 * 60_000;
const SPOTIFY_RATE_LIMIT_FALLBACK_MS = 30_000;
const SPOTIFY_PLAYLIST_TRACK_SEARCH_MIN_QUERY_LENGTH = 4;
const SPOTIFY_PLAYLIST_TRACK_INDEX_CONCURRENCY = 2;
const SPOTIFY_PLAYLIST_TRACK_PAGE_LIMIT = 50;
const SPOTIFY_SUPABASE_CACHE_TTL_MS = 6 * 60 * 60_000;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyProfileResponse = {
  id: string;
  display_name: string | null;
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
  snapshot_id: string;
  description: string | null;
  collaborative: boolean;
  public: boolean | null;
  external_urls?: {
    spotify?: string;
  };
  images?: Array<{
    url: string;
    width: number | null;
    height: number | null;
  }>;
  owner: {
    id: string;
    display_name: string | null;
  };
  tracks: {
    total: number;
  };
};

type SpotifyPlaylistPageResponse = {
  items: SpotifyPlaylistResponse[];
  next: string | null;
};

type SpotifyTrackResponse = {
  id: string | null;
  name: string;
  duration_ms: number | null;
  is_local: boolean;
  album?: {
    name?: string;
    release_date?: string;
  };
  artists?: Array<{
    name: string;
  }>;
};

type SpotifyPlaylistTrackItemResponse = {
  track: SpotifyTrackResponse | null;
};

type SpotifyPlaylistTrackPageResponse = {
  items: SpotifyPlaylistTrackItemResponse[];
  next: string | null;
};

type SpotifyPlaylistTrackSearchIndexTrack = SpotifyPlaylistTrackSearchPreviewAsset & {
  normalizedTrackName: string;
  canonicalTrackName: string;
};

type SpotifyPlaylistTrackSearchIndexEntry = {
  playlistId: string;
  tracks: SpotifyPlaylistTrackSearchIndexTrack[];
};

class SpotifyApiError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(status: number, detail: string, retryAfterMs: number | null = null) {
    super(`Spotify devolvió ${status}: ${detail}`);
    this.name = "SpotifyApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

let spotifyAccessTokenCache:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | null = null;
let spotifyAccessTokenPromise: Promise<string> | null = null;
let spotifyPlaylistListCache:
  | {
      result: SpotifyPlaylistListResult;
      expiresAt: number;
    }
  | null = null;
let spotifyPlaylistTrackIndexCache:
  | {
      entries: SpotifyPlaylistTrackSearchIndexEntry[];
      expiresAt: number;
    }
  | null = null;
let spotifyPlaylistTrackIndexPromise:
  | Promise<SpotifyPlaylistTrackSearchIndexEntry[]>
  | null = null;
let spotifySupabaseCacheSyncPromise: Promise<void> | null = null;
const spotifyPlaylistTrackQueryCache = new Map<
  string,
  {
    hits: SpotifyPlaylistTrackSearchHitAsset[];
    expiresAt: number;
  }
>();
let spotifyRateLimitUntil = 0;

function normalizeEnvValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getSpotifyClientId() {
  return normalizeEnvValue(process.env.SPOTIFY_CLIENT_ID);
}

function getSpotifyClientSecret() {
  return normalizeEnvValue(process.env.SPOTIFY_CLIENT_SECRET);
}

function getSpotifyRefreshToken() {
  return normalizeEnvValue(process.env.SPOTIFY_REFRESH_TOKEN);
}

export function getSpotifyRedirectUri() {
  return normalizeEnvValue(process.env.SPOTIFY_REDIRECT_URI);
}

export function getSpotifyLoginPath() {
  return SPOTIFY_LOGIN_PATH;
}

export function getSpotifyCallbackPath() {
  return SPOTIFY_CALLBACK_PATH;
}

export function getSpotifyScopes() {
  return [...SPOTIFY_SCOPE_LIST];
}

export function getSpotifyStateCookieName() {
  return SPOTIFY_STATE_COOKIE_NAME;
}

export function getSpotifyStateCookieMaxAge() {
  return SPOTIFY_STATE_COOKIE_MAX_AGE;
}

export function isSpotifyConfigured() {
  return Boolean(
    getSpotifyClientId() && getSpotifyClientSecret() && getSpotifyRedirectUri(),
  );
}

export function isSpotifyConnected() {
  return Boolean(isSpotifyConfigured() && getSpotifyRefreshToken());
}

export function createSpotifyAuthState() {
  return randomUUID().replaceAll("-", "");
}

export function verifySpotifyAuthState(expectedState: string, currentState: string) {
  const expectedBuffer = Buffer.from(expectedState);
  const currentBuffer = Buffer.from(currentState);

  if (
    expectedBuffer.length === 0 ||
    currentBuffer.length === 0 ||
    expectedBuffer.length !== currentBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, currentBuffer);
}

function getSpotifyBasicAuthorizationHeader() {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET para hablar con Spotify.",
    );
  }

  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestSpotifyToken(body: URLSearchParams) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: getSpotifyBasicAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Spotify devolvió ${response.status} al pedir el token: ${errorText}`,
    );
  }

  return (await response.json()) as SpotifyTokenResponse;
}

export function createSpotifyAuthorizationUrl(state: string) {
  if (!isSpotifyConfigured()) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: getSpotifyClientId(),
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    scope: SPOTIFY_SCOPE_LIST.join(" "),
    state,
    show_dialog: "true",
  });

  return `${SPOTIFY_ACCOUNTS_BASE_URL}/authorize?${params.toString()}`;
}

export async function exchangeSpotifyAuthorizationCode(code: string) {
  if (!isSpotifyConfigured()) {
    throw new Error(
      "Faltan variables de entorno de Spotify. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI.",
    );
  }

  return requestSpotifyToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(),
    }),
  );
}

async function getSpotifyAccessToken() {
  if (
    spotifyAccessTokenCache &&
    Date.now() < spotifyAccessTokenCache.expiresAt
  ) {
    return spotifyAccessTokenCache.accessToken;
  }

  if (spotifyAccessTokenPromise) {
    return spotifyAccessTokenPromise;
  }

  const refreshToken = getSpotifyRefreshToken();

  if (!refreshToken) {
    throw new Error(
      "Falta SPOTIFY_REFRESH_TOKEN. Autoriza la app una vez para obtenerlo.",
    );
  }

  spotifyAccessTokenPromise = requestSpotifyToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  )
    .then((tokenResponse) => {
      spotifyAccessTokenCache = {
        accessToken: tokenResponse.access_token,
        expiresAt:
          Date.now() +
          Math.max(
            tokenResponse.expires_in * 1000 - SPOTIFY_ACCESS_TOKEN_REFRESH_BUFFER_MS,
            1_000,
          ),
      };

      return tokenResponse.access_token;
    })
    .finally(() => {
      spotifyAccessTokenPromise = null;
    });

  return spotifyAccessTokenPromise;
}

async function fetchSpotifyJson<T>(
  input: string,
  accessToken: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = Number.parseInt(retryAfterHeader ?? "", 10);
    const retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : null;
    const error = new SpotifyApiError(
      response.status,
      errorText,
      retryAfterMs,
    );

    if (error.status === 429) {
      spotifyRateLimitUntil = Math.max(
        spotifyRateLimitUntil,
        Date.now() + (error.retryAfterMs ?? SPOTIFY_RATE_LIMIT_FALLBACK_MS),
      );
    }

    throw error;
  }

  return (await response.json()) as T;
}

function isSpotifyExpiredTokenError(error: unknown) {
  return (
    error instanceof SpotifyApiError &&
    error.status === 401 &&
    error.message.includes("The access token expired")
  );
}

function isSpotifyRateLimitError(error: unknown) {
  return error instanceof SpotifyApiError && error.status === 429;
}

function getSpotifyRateLimitMessage() {
  const remainingMs = Math.max(spotifyRateLimitUntil - Date.now(), 0);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return remainingSeconds > 0
    ? `Spotify está limitando temporalmente las peticiones. Espera ${remainingSeconds} s y vuelve a intentarlo.`
    : "Spotify está limitando temporalmente las peticiones. Espera un momento y vuelve a intentarlo.";
}

function formatSpotifyErrorMessage(error: unknown, fallbackMessage: string) {
  if (isSpotifyRateLimitError(error)) {
    return getSpotifyRateLimitMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function getCachedSpotifyPlaylistListResult(options?: { allowStale?: boolean }) {
  if (!spotifyPlaylistListCache) {
    return null;
  }

  if (options?.allowStale || spotifyPlaylistListCache.expiresAt > Date.now()) {
    return spotifyPlaylistListCache.result;
  }

  return null;
}

function cacheSpotifyPlaylistListResult(result: SpotifyPlaylistListResult) {
  spotifyPlaylistListCache = {
    result,
    expiresAt: Date.now() + SPOTIFY_PLAYLIST_LIST_CACHE_TTL_MS,
  };
}

function getCachedSpotifyPlaylistTrackQueryHits(
  normalizedQuery: string,
  options?: { allowStale?: boolean },
) {
  const cachedEntry = spotifyPlaylistTrackQueryCache.get(normalizedQuery);

  if (!cachedEntry) {
    return null;
  }

  if (options?.allowStale || cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.hits;
  }

  spotifyPlaylistTrackQueryCache.delete(normalizedQuery);

  return null;
}

function cacheSpotifyPlaylistTrackQueryHits(
  normalizedQuery: string,
  hits: SpotifyPlaylistTrackSearchHitAsset[],
) {
  spotifyPlaylistTrackQueryCache.set(normalizedQuery, {
    hits,
    expiresAt: Date.now() + SPOTIFY_PLAYLIST_TRACK_QUERY_CACHE_TTL_MS,
  });
}

function clearSpotifyAccessTokenCache() {
  spotifyAccessTokenCache = null;
}

async function mapValuesWithConcurrencyLimit<TValue, TResult>(
  values: TValue[],
  concurrencyLimit: number,
  mapper: (value: TValue, index: number) => Promise<TResult>,
) {
  const results = new Array<TResult>(values.length);
  const workerCount = Math.max(1, Math.min(concurrencyLimit, values.length));
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;

      nextIndex += 1;

      if (currentIndex >= values.length) {
        return;
      }

      results[currentIndex] = await mapper(
        values[currentIndex] as TValue,
        currentIndex,
      );
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function stripHtml(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const withoutTags = trimmedValue.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const compact = decoded.replace(/\s+/g, " ").trim();

  return compact || null;
}

function getVisibilityLabel(playlist: SpotifyPlaylistResponse) {
  if (playlist.collaborative) {
    return "Colaborativa";
  }

  if (playlist.public === false) {
    return "Privada";
  }

  return "Pública";
}

function mapSpotifyPlaylist(playlist: SpotifyPlaylistResponse) {
  const imageUrl = playlist.images?.[0]?.url?.trim() || null;
  const externalUrl =
    playlist.external_urls?.spotify?.trim() ||
    `https://open.spotify.com/playlist/${playlist.id}`;

  return {
    id: playlist.id,
    name: playlist.name.trim(),
    description: stripHtml(playlist.description),
    imageUrl,
    externalUrl,
    embedUrl: `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator`,
    ownerName: playlist.owner.display_name?.trim() || "Spotify",
    trackCount: playlist.tracks.total,
    visibilityLabel: getVisibilityLabel(playlist),
    collaborative: playlist.collaborative,
  } satisfies SpotifyPlaylistAsset;
}

function buildSpotifyArtistQuickAccess(
  artistId: string,
  label: string,
): SpotifyQuickAccessAsset {
  return {
    id: artistId,
    label: label.trim(),
    eyebrow: "Perfil",
    href: `https://open.spotify.com/artist/${artistId}`,
    imageUrl: null,
    kind: "artist",
  } satisfies SpotifyQuickAccessAsset;
}

function buildLegacyQuickAccess(
  playlists: SpotifyPlaylistAsset[],
): SpotifyQuickAccessAsset | null {
  const legacyPlaylist =
    playlists.find(
      (playlist) =>
        playlist.name.trim().toLocaleLowerCase("es-ES") === "legacy",
    ) ?? null;

  if (!legacyPlaylist) {
    return null;
  }

  return {
    id: `playlist-${legacyPlaylist.id}`,
    label: legacyPlaylist.name,
    eyebrow: "Lista",
    href: legacyPlaylist.externalUrl,
    imageUrl: legacyPlaylist.imageUrl,
    kind: "playlist",
  } satisfies SpotifyQuickAccessAsset;
}

function buildSpotifyQuickAccess(playlists: SpotifyPlaylistAsset[]) {
  return [
    buildSpotifyArtistQuickAccess(KINTELA_SPOTIFY_ARTIST_ID, "kintela"),
    buildSpotifyArtistQuickAccess(
      DESGARRAMANTAS_SPOTIFY_ARTIST_ID,
      "Desgarramantas",
    ),
    buildLegacyQuickAccess(playlists),
  ].filter((asset): asset is SpotifyQuickAccessAsset => asset !== null);
}

function buildSpotifyPlaylistListResult(
  playlists: SpotifyPlaylistAsset[],
  accountName: string | null,
  error: string | null = null,
) {
  return {
    playlists,
    quickAccess: buildSpotifyQuickAccess(playlists),
    configured: true,
    connected: true,
    error,
    accountName,
    loginHref: getSpotifyLoginPath(),
    callbackPath: getSpotifyCallbackPath(),
  } satisfies SpotifyPlaylistListResult;
}

function normalizeAlbumReleaseDate(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^\d{4}$/.test(trimmedValue)) {
    return `${trimmedValue}-00-00`;
  }

  if (/^\d{4}-\d{2}$/.test(trimmedValue)) {
    return `${trimmedValue}-00`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return null;
}

function compareSpotifyTracks(
  left: SpotifyPlaylistTrackAsset,
  right: SpotifyPlaylistTrackAsset,
) {
  const leftDate = left.albumReleaseDate ?? "9999-99-99";
  const rightDate = right.albumReleaseDate ?? "9999-99-99";

  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate, "es", { sensitivity: "base" });
  }

  const byName = left.name.localeCompare(right.name, "es", {
    sensitivity: "base",
  });

  if (byName !== 0) {
    return byName;
  }

  const byAlbum = (left.albumName ?? "").localeCompare(right.albumName ?? "", "es", {
    sensitivity: "base",
  });

  if (byAlbum !== 0) {
    return byAlbum;
  }

  return left.artistsLabel.localeCompare(right.artistsLabel, "es", {
    sensitivity: "base",
  });
}

function matchesSpotifyTopicTrack(
  track: SpotifyTrackResponse | null,
  expectedTrackName: string,
  expectedArtistName: string,
) {
  if (!track || track.is_local) {
    return false;
  }

  const normalizedExpectedTrackName =
    canonicalizeSpotifyTrackNameForMatch(expectedTrackName);
  const normalizedExpectedArtistName = normalizeSpotifyMatchValue(expectedArtistName);
  const normalizedTrackName = canonicalizeSpotifyTrackNameForMatch(track.name);

  if (
    !normalizedExpectedTrackName ||
    !normalizedExpectedArtistName ||
    !normalizedTrackName ||
    normalizedTrackName !== normalizedExpectedTrackName
  ) {
    return false;
  }

  const normalizedArtists = (track.artists ?? [])
    .map((artist) => normalizeSpotifyMatchValue(artist.name))
    .filter(Boolean);

  return normalizedArtists.some(
    (artistName) =>
      artistName === normalizedExpectedArtistName ||
      artistName.includes(normalizedExpectedArtistName) ||
      normalizedExpectedArtistName.includes(artistName),
  );
}

function mapSpotifyTrackSearchPreview(
  track: SpotifyTrackResponse | null,
): SpotifyPlaylistTrackSearchPreviewAsset | null {
  if (!track || track.is_local) {
    return null;
  }

  const trackName = track.name.trim();

  if (!trackName) {
    return null;
  }

  return {
    trackName,
    trackArtistsLabel:
      track.artists
        ?.map((artist) => artist.name.trim())
        .filter(Boolean)
        .join(" · ") || "Spotify",
  } satisfies SpotifyPlaylistTrackSearchPreviewAsset;
}

function mapSpotifyTrackSearchIndexTrack(
  track: SpotifyTrackResponse | null,
): SpotifyPlaylistTrackSearchIndexTrack | null {
  const preview = mapSpotifyTrackSearchPreview(track);

  if (!preview) {
    return null;
  }

  return {
    ...preview,
    normalizedTrackName: normalizeSpotifyMatchValue(preview.trackName),
    canonicalTrackName: canonicalizeSpotifyTrackNameForMatch(preview.trackName),
  };
}

async function createSpotifyJsonFetcherWithRetry() {
  let accessToken = await getSpotifyAccessToken();

  return async function fetchSpotifyJsonWithRetry<T>(input: string) {
    try {
      return await fetchSpotifyJson<T>(input, accessToken);
    } catch (error) {
      if (!isSpotifyExpiredTokenError(error)) {
        throw error;
      }

      clearSpotifyAccessTokenCache();
      accessToken = await getSpotifyAccessToken();

      return fetchSpotifyJson<T>(input, accessToken);
    }
  };
}

async function fetchSpotifyOwnedPlaylistsSnapshot(
  fetchSpotifyJsonWithRetry: <T>(input: string) => Promise<T>,
) {
  const profile = await fetchSpotifyJsonWithRetry<SpotifyProfileResponse>(
    `${SPOTIFY_API_BASE_URL}/me`,
  );
  const playlists: SpotifyPlaylistResponse[] = [];
  let nextUrl: string | null = `${SPOTIFY_API_BASE_URL}/me/playlists?limit=50`;
  let pageCount = 0;

  while (nextUrl && pageCount < 6) {
    const playlistPage: SpotifyPlaylistPageResponse =
      await fetchSpotifyJsonWithRetry<SpotifyPlaylistPageResponse>(nextUrl);

    playlists.push(...playlistPage.items);
    nextUrl = playlistPage.next;
    pageCount += 1;
  }

  return {
    profile,
    playlists: playlists
      .filter((playlist) => playlist.owner.id === profile.id)
      .sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
  };
}

async function fetchSpotifyPlaylistTrackItems(
  playlistId: string,
  fetchSpotifyJsonWithRetry: <T>(input: string) => Promise<T>,
) {
  const trackItems: SpotifyPlaylistTrackItemResponse[] = [];
  let nextUrl: string | null =
    `${SPOTIFY_API_BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&fields=items(track(id,name,album(name,release_date),artists(name),duration_ms,is_local)),next`;
  let pageCount = 0;

  while (nextUrl && pageCount < SPOTIFY_PLAYLIST_TRACK_PAGE_LIMIT) {
    const trackPage: SpotifyPlaylistTrackPageResponse =
      await fetchSpotifyJsonWithRetry<SpotifyPlaylistTrackPageResponse>(nextUrl);

    trackItems.push(...trackPage.items);
    nextUrl = trackPage.next;
    pageCount += 1;
  }

  return trackItems;
}

function mapSpotifyPlaylistTrackCacheEntry(
  item: SpotifyPlaylistTrackItemResponse,
  position: number,
) {
  const track = item.track;

  if (!track || track.is_local) {
    return null;
  }

  const name = track.name.trim();

  if (!name) {
    return null;
  }

  const artistsLabel =
    track.artists
      ?.map((artist) => artist.name.trim())
      .filter(Boolean)
      .join(" · ") || "Spotify";
  const albumName = track.album?.name?.trim() || null;
  const albumReleaseDate = normalizeAlbumReleaseDate(track.album?.release_date);

  return {
    spotifyTrackId: track.id?.trim() || null,
    position,
    name,
    artistsLabel,
    albumName,
    albumReleaseDate,
    durationMs: track.duration_ms,
    isLocal: track.is_local,
    normalizedTrackName: normalizeSpotifyMatchValue(name),
    canonicalTrackName: canonicalizeSpotifyTrackNameForMatch(name),
  };
}

async function hydrateSpotifyTrackYouTubeMetadata(
  tracks: SpotifyPlaylistTrackAsset[],
) {
  const trackMetadataByKey = await readYouTubeMatchCacheTrackMetadata(
    tracks.map((track) =>
      getYouTubeSongVideoCacheKey({
        trackName: track.name,
        artistsLabel: track.artistsLabel,
        albumName: track.albumName,
        albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
      }),
    ),
  );

  return tracks.map((track) => ({
    ...track,
    youtubeCacheStatus: trackMetadataByKey[
      getYouTubeSongVideoCacheKey({
        trackName: track.name,
        artistsLabel: track.artistsLabel,
        albumName: track.albumName,
        albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
      })
    ]?.cached
      ? "cached"
      : "uncached",
    rating:
      trackMetadataByKey[
        getYouTubeSongVideoCacheKey({
          trackName: track.name,
          artistsLabel: track.artistsLabel,
          albumName: track.albumName,
          albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
        })
      ]?.rating ?? 0,
  }));
}

export async function syncSpotifyOwnedPlaylistCache(options?: {
  force?: boolean;
  playlistId?: string;
}) {
  if (!isSpotifyConfigured() || !isSpotifyConnected()) {
    return;
  }

  if (spotifySupabaseCacheSyncPromise) {
    return spotifySupabaseCacheSyncPromise;
  }

  const targetPlaylistId = options?.playlistId?.trim() ?? "";

  spotifySupabaseCacheSyncPromise = (async () => {
    const [
      existingState,
      existingTrackCountByPlaylistCacheId,
      fetchSpotifyJsonWithRetry,
    ] = await Promise.all([
      readSpotifyCachedPlaylistSyncState(),
      readSpotifyCachedPlaylistTrackCounts(),
      createSpotifyJsonFetcherWithRetry(),
    ]);
    const existingStateBySpotifyId = new Map(
      existingState.map((playlist) => [playlist.spotifyId, playlist]),
    );
    const { playlists } = await fetchSpotifyOwnedPlaylistsSnapshot(
      fetchSpotifyJsonWithRetry,
    );
    const deactivationResult = await markMissingSpotifyCachedPlaylistsInactive(
      playlists.map((playlist) => playlist.id),
    );

    if (!deactivationResult.ok) {
      throw new Error(deactivationResult.error);
    }

    if (playlists.length === 0) {
      return;
    }

    const playlistUpsertResult = await upsertSpotifyCachedPlaylists(
      playlists.map((playlist) => ({
        spotifyId: playlist.id,
        name: playlist.name.trim(),
        description: stripHtml(playlist.description),
        imageUrl: playlist.images?.[0]?.url?.trim() || null,
        externalUrl:
          playlist.external_urls?.spotify?.trim() ||
          `https://open.spotify.com/playlist/${playlist.id}`,
        ownerSpotifyId: playlist.owner.id.trim(),
        ownerName: playlist.owner.display_name?.trim() || null,
        trackCount: playlist.tracks.total,
        visibilityLabel: getVisibilityLabel(playlist),
        collaborative: playlist.collaborative,
        snapshotId: playlist.snapshot_id.trim(),
      })),
    );

    if (!playlistUpsertResult.ok) {
      throw new Error(playlistUpsertResult.error);
    }

    const playlistsToRefresh = playlists.filter((playlist) => {
      if (targetPlaylistId && playlist.id !== targetPlaylistId) {
        return false;
      }

      const currentState = existingStateBySpotifyId.get(playlist.id);
      const cachedTrackCount = currentState
        ? existingTrackCountByPlaylistCacheId.get(currentState.id) ?? 0
        : 0;

      return (
        options?.force ||
        Boolean(targetPlaylistId) ||
        !currentState ||
        !currentState.isActive ||
        cachedTrackCount === 0 ||
        currentState.snapshotId !== playlist.snapshot_id.trim()
      );
    });

    await mapValuesWithConcurrencyLimit(
      playlistsToRefresh,
      SPOTIFY_PLAYLIST_TRACK_INDEX_CONCURRENCY,
      async (playlist) => {
        const playlistCacheId =
          playlistUpsertResult.playlistCacheIdBySpotifyId.get(playlist.id) ?? 0;

        if (!playlistCacheId) {
          throw new Error(
            `No he encontrado la playlist cacheada ${playlist.name.trim()}.`,
          );
        }

        const trackItems = await fetchSpotifyPlaylistTrackItems(
          playlist.id,
          fetchSpotifyJsonWithRetry,
        );
        const replaceResult = await replaceSpotifyCachedPlaylistTracks({
          playlistCacheId,
          tracks: trackItems
            .map((item, index) =>
              mapSpotifyPlaylistTrackCacheEntry(item, index + 1),
            )
            .filter(
              (
                track,
              ): track is NonNullable<
                ReturnType<typeof mapSpotifyPlaylistTrackCacheEntry>
              > => track !== null,
            ),
        });

        if (!replaceResult.ok) {
          throw new Error(replaceResult.error);
        }
      },
    );

    spotifyPlaylistListCache = null;
    spotifyPlaylistTrackIndexCache = null;
    spotifyPlaylistTrackQueryCache.clear();
  })().finally(() => {
    spotifySupabaseCacheSyncPromise = null;
  });

  return spotifySupabaseCacheSyncPromise;
}

async function ensureSpotifyPlaylistCacheReady(options?: { force?: boolean }) {
  const summary = await getSpotifyCacheSummary();
  const activePlaylistCount = summary?.activePlaylistCount ?? 0;
  const activePlaylistCountWithTracks =
    summary?.activePlaylistCountWithTracks ?? 0;
  const cachedTrackCount = summary?.cachedTrackCount ?? 0;
  const latestSyncAtMs = summary?.latestSyncAt
    ? Date.parse(summary.latestSyncAt)
    : Number.NaN;
  const hasCache = activePlaylistCount > 0;
  const hasCachedTracks =
    cachedTrackCount > 0 && activePlaylistCountWithTracks >= activePlaylistCount;
  const isStale =
    !Number.isFinite(latestSyncAtMs) ||
    Date.now() - latestSyncAtMs > SPOTIFY_SUPABASE_CACHE_TTL_MS;

  if (!hasCache || !hasCachedTracks || options?.force || isStale) {
    try {
      await syncSpotifyOwnedPlaylistCache({
        force: options?.force || !hasCachedTracks,
      });
      return true;
    } catch (error) {
      if (!hasCache) {
        throw error;
      }

      console.warn(
        `[spotify-cache] No he podido refrescar la caché persistente: ${
          error instanceof Error ? error.message : "Error desconocido."
        }`,
      );
    }
  }

  return hasCache;
}

async function getSpotifyOwnedPlaylistTrackSearchIndex() {
  if (
    spotifyPlaylistTrackIndexCache &&
    (spotifyPlaylistTrackIndexCache.expiresAt > Date.now() ||
      spotifyRateLimitUntil > Date.now())
  ) {
    return spotifyPlaylistTrackIndexCache.entries;
  }

  if (spotifyRateLimitUntil > Date.now()) {
    throw new SpotifyApiError(
      429,
      getSpotifyRateLimitMessage(),
      spotifyRateLimitUntil - Date.now(),
    );
  }

  if (spotifyPlaylistTrackIndexPromise) {
    return spotifyPlaylistTrackIndexPromise;
  }

  spotifyPlaylistTrackIndexPromise = (async () => {
    try {
      let accessToken = await getSpotifyAccessToken();
      const fetchSpotifyJsonWithRetry = async <T>(input: string) => {
        try {
          return await fetchSpotifyJson<T>(input, accessToken);
        } catch (error) {
          if (!isSpotifyExpiredTokenError(error)) {
            throw error;
          }

          clearSpotifyAccessTokenCache();
          accessToken = await getSpotifyAccessToken();

          return fetchSpotifyJson<T>(input, accessToken);
        }
      };
      const profile = await fetchSpotifyJsonWithRetry<SpotifyProfileResponse>(
        `${SPOTIFY_API_BASE_URL}/me`,
      );
      const playlists: SpotifyPlaylistResponse[] = [];
      let nextPlaylistUrl: string | null =
        `${SPOTIFY_API_BASE_URL}/me/playlists?limit=50`;
      let playlistPageCount = 0;

      while (nextPlaylistUrl && playlistPageCount < 6) {
        const playlistPage: SpotifyPlaylistPageResponse =
          await fetchSpotifyJsonWithRetry<SpotifyPlaylistPageResponse>(
            nextPlaylistUrl,
          );

        playlists.push(...playlistPage.items);
        nextPlaylistUrl = playlistPage.next;
        playlistPageCount += 1;
      }

      const ownedPlaylists = playlists
        .filter((playlist) => playlist.owner.id === profile.id)
        .map(mapSpotifyPlaylist)
        .sort((left, right) =>
          left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
        );
      const entries = await mapValuesWithConcurrencyLimit(
        ownedPlaylists,
        SPOTIFY_PLAYLIST_TRACK_INDEX_CONCURRENCY,
        async (playlist) => {
          let nextTrackUrl: string | null =
            `${SPOTIFY_API_BASE_URL}/playlists/${encodeURIComponent(playlist.id)}/tracks?limit=100&fields=items(track(name,artists(name),is_local)),next`;
          let trackPageCount = 0;
          const tracks: SpotifyPlaylistTrackSearchIndexTrack[] = [];

          while (nextTrackUrl && trackPageCount < SPOTIFY_PLAYLIST_TRACK_PAGE_LIMIT) {
            const trackPage: SpotifyPlaylistTrackPageResponse =
              await fetchSpotifyJsonWithRetry<SpotifyPlaylistTrackPageResponse>(
                nextTrackUrl,
              );

            for (const item of trackPage.items) {
              const indexedTrack = mapSpotifyTrackSearchIndexTrack(item.track);

              if (indexedTrack) {
                tracks.push(indexedTrack);
              }
            }

            nextTrackUrl = trackPage.next;
            trackPageCount += 1;
          }

          return {
            playlistId: playlist.id,
            tracks,
          } satisfies SpotifyPlaylistTrackSearchIndexEntry;
        },
      );

      spotifyPlaylistTrackIndexCache = {
        entries,
        expiresAt: Date.now() + SPOTIFY_PLAYLIST_TRACK_INDEX_CACHE_TTL_MS,
      };

      return entries;
    } catch (error) {
      if (spotifyPlaylistTrackIndexCache) {
        return spotifyPlaylistTrackIndexCache.entries;
      }

      throw error;
    } finally {
      spotifyPlaylistTrackIndexPromise = null;
    }
  })();

  return spotifyPlaylistTrackIndexPromise;
}

export async function searchSpotifyOwnedPlaylistsByTrackQuery(
  query: string,
): Promise<SpotifyPlaylistTrackSearchHitAsset[]> {
  if (!isSpotifyConfigured() || !isSpotifyConnected()) {
    return [];
  }

  const normalizedQuery = normalizeSpotifyMatchValue(query);

  if (
    !normalizedQuery ||
    normalizedQuery.length < SPOTIFY_PLAYLIST_TRACK_SEARCH_MIN_QUERY_LENGTH
  ) {
    return [];
  }

  const cachedHits = getCachedSpotifyPlaylistTrackQueryHits(normalizedQuery, {
    allowStale: spotifyRateLimitUntil > Date.now(),
  });

  if (cachedHits) {
    return cachedHits;
  }

  try {
    const cacheReady = await ensureSpotifyPlaylistCacheReady();

    if (cacheReady) {
      const persistedHits = await searchSpotifyCachedPlaylistsByTrackQuery(
        normalizedQuery,
      );

      if (persistedHits.length > 0) {
        cacheSpotifyPlaylistTrackQueryHits(normalizedQuery, persistedHits);

        return persistedHits;
      }

      await ensureSpotifyPlaylistCacheReady({ force: true });

      const refreshedHits = await searchSpotifyCachedPlaylistsByTrackQuery(
        normalizedQuery,
      );

      cacheSpotifyPlaylistTrackQueryHits(normalizedQuery, refreshedHits);

      return refreshedHits;
    }

    const indexEntries = await getSpotifyOwnedPlaylistTrackSearchIndex();
    const hits = indexEntries.flatMap((entry) => {
      const matchedTrack =
        entry.tracks.find(
          (track) =>
            track.normalizedTrackName.includes(normalizedQuery) ||
            track.canonicalTrackName.includes(normalizedQuery),
        ) ?? null;

      if (!matchedTrack) {
        return [];
      }

      return [
        {
          playlistId: entry.playlistId,
          matchedTrack: {
            trackName: matchedTrack.trackName,
            trackArtistsLabel: matchedTrack.trackArtistsLabel,
          },
        } satisfies SpotifyPlaylistTrackSearchHitAsset,
      ];
    });

    cacheSpotifyPlaylistTrackQueryHits(normalizedQuery, hits);

    return hits;
  } catch (error) {
    const staleHits = getCachedSpotifyPlaylistTrackQueryHits(normalizedQuery, {
      allowStale: true,
    });

    if (staleHits) {
      return staleHits;
    }

    console.warn(
      `[spotify-playlist-search] No he podido buscar "${query.trim()}" en las playlists: ${
        error instanceof Error ? error.message : "Error desconocido."
      }`,
    );

    return [];
  }
}

export async function findSpotifyTopicMatchInOwnedPlaylists({
  topicName,
  groupName,
}: {
  topicName: string;
  groupName: string;
}): Promise<SpotifyTopicMatchAsset | null> {
  if (!isSpotifyConfigured() || !isSpotifyConnected()) {
    return null;
  }

  const normalizedTopicName = topicName.trim();
  const normalizedGroupName = groupName.trim();

  if (!normalizedTopicName || !normalizedGroupName) {
    return null;
  }

  try {
    const cacheReady = await ensureSpotifyPlaylistCacheReady();

    if (cacheReady) {
      const cachedMatch = await findSpotifyCachedTopicMatch({
        topicName: normalizedTopicName,
        groupName: normalizedGroupName,
      });

      if (cachedMatch) {
        return cachedMatch;
      }
    }

    const fetchSpotifyJsonWithRetry = await createSpotifyJsonFetcherWithRetry();
    const { profile, playlists } = await fetchSpotifyOwnedPlaylistsSnapshot(
      fetchSpotifyJsonWithRetry,
    );
    const candidatePlaylists = playlists
      .map((playlist) => ({
        playlist: mapSpotifyPlaylist(playlist),
        isOwnedByCurrentUser: playlist.owner.id === profile.id,
      }))
      .sort((left, right) => {
        if (left.isOwnedByCurrentUser !== right.isOwnedByCurrentUser) {
          return left.isOwnedByCurrentUser ? -1 : 1;
        }

        return left.playlist.name.localeCompare(right.playlist.name, "es", {
          sensitivity: "base",
        });
      });

    for (const { playlist } of candidatePlaylists) {
      let nextTrackUrl: string | null =
        `${SPOTIFY_API_BASE_URL}/playlists/${encodeURIComponent(playlist.id)}/tracks?limit=100&fields=items(track(id,name,artists(name),is_local)),next`;
      let trackPageCount = 0;

      while (nextTrackUrl && trackPageCount < SPOTIFY_PLAYLIST_TRACK_PAGE_LIMIT) {
        const trackPage: SpotifyPlaylistTrackPageResponse =
          await fetchSpotifyJsonWithRetry<SpotifyPlaylistTrackPageResponse>(
          nextTrackUrl,
          );
        const matchedTrack = trackPage.items
          .map((item) => item.track)
          .find((track) =>
            matchesSpotifyTopicTrack(
              track,
              normalizedTopicName,
              normalizedGroupName,
            ),
          );

        if (matchedTrack?.id) {
          const trackArtistsLabel =
            matchedTrack.artists
              ?.map((artist) => artist.name.trim())
              .filter(Boolean)
              .join(" · ") || normalizedGroupName;

          return {
            playlistId: playlist.id,
            playlistName: playlist.name,
            playlistExternalUrl: playlist.externalUrl,
            highlightedPlaylistUrl: buildSpotifyHighlightedPlaylistUrl(
              playlist.externalUrl,
              matchedTrack.id,
            ),
            trackId: matchedTrack.id,
            trackName: matchedTrack.name.trim(),
            trackArtistsLabel,
            trackExternalUrl: buildSpotifyTrackExternalUrl(matchedTrack.id),
          } satisfies SpotifyTopicMatchAsset;
        }

        nextTrackUrl = trackPage.next;
        trackPageCount += 1;
      }
    }

    return null;
  } catch (error) {
    console.warn(
      `[spotify-topic-match] No he podido buscar "${normalizedTopicName}" en Spotify: ${
        error instanceof Error ? error.message : "Error desconocido."
      }`,
    );

    return null;
  }
}

export async function getSpotifyPlaylistList(): Promise<SpotifyPlaylistListResult> {
  if (!isSpotifyConfigured()) {
    return {
      playlists: [],
      quickAccess: [],
      configured: false,
      connected: false,
      error:
        "Faltan variables de entorno de Spotify. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI.",
      accountName: null,
      loginHref: getSpotifyLoginPath(),
      callbackPath: getSpotifyCallbackPath(),
    };
  }

  if (!isSpotifyConnected()) {
    return {
      playlists: [],
      quickAccess: [],
      configured: true,
      connected: false,
      error: null,
      accountName: null,
      loginHref: getSpotifyLoginPath(),
      callbackPath: getSpotifyCallbackPath(),
    };
  }

  const cachedResult = getCachedSpotifyPlaylistListResult();

  if (cachedResult) {
    return cachedResult;
  }

  try {
    const persistedPlaylists = await readSpotifyCachedPlaylists();

    if (persistedPlaylists.length > 0) {
      const persistedResult = buildSpotifyPlaylistListResult(
        persistedPlaylists,
        persistedPlaylists[0]?.ownerName ?? null,
      );

      cacheSpotifyPlaylistListResult(persistedResult);

      return persistedResult;
    }

    return buildSpotifyPlaylistListResult(
      [],
      null,
      "La caché de Spotify está vacía. Ejecuta la sincronización protegida para poblar las tablas.",
    );
  } catch (error) {
    const staleResult = getCachedSpotifyPlaylistListResult({ allowStale: true });

    if (staleResult) {
      return staleResult;
    }

    return {
      playlists: [],
      quickAccess: [],
      configured: true,
      connected: true,
      error: `No he podido leer Spotify: ${formatSpotifyErrorMessage(
        error,
        "No he podido leer las playlists de Spotify.",
      )}`,
      accountName: null,
      loginHref: getSpotifyLoginPath(),
      callbackPath: getSpotifyCallbackPath(),
    };
  }
}

export async function getSpotifyPlaylistTracks(playlistId: string) {
  if (!isSpotifyConfigured()) {
    throw new Error(
      "Faltan variables de entorno de Spotify. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI.",
    );
  }

  if (!isSpotifyConnected()) {
    throw new Error(
      "Falta SPOTIFY_REFRESH_TOKEN. Autoriza la app una vez para obtenerlo.",
    );
  }

  const normalizedPlaylistId = playlistId.trim();

  if (!normalizedPlaylistId) {
    throw new Error("Falta el identificador de la playlist de Spotify.");
  }

  try {
    const cachedTracks = await readSpotifyCachedPlaylistTracks(
      normalizedPlaylistId,
    );

    if (cachedTracks.length > 0) {
      const sortedCachedTracks = [...cachedTracks]
        .sort(compareSpotifyTracks)
        .map((track, index) => ({
          ...track,
          position: index + 1,
        }));

      return hydrateSpotifyTrackYouTubeMetadata(sortedCachedTracks);
    }
  } catch (error) {
    console.warn(
      `[spotify-cache] No he podido leer la playlist ${normalizedPlaylistId} desde la caché: ${
        error instanceof Error ? error.message : "Error desconocido."
      }`,
    );
  }

  throw new Error(
    "No hay canciones cacheadas para esta playlist. Ejecuta la sincronización de Spotify para poblar la tabla de canciones.",
  );
}

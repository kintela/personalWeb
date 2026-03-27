import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import type {
  SpotifyPlaylistAsset,
  SpotifyPlaylistListResult,
  SpotifyQuickAccessAsset,
  SpotifyPlaylistTrackAsset,
} from "@/lib/spotify-types";

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

type SpotifyArtistResponse = {
  id: string;
  name: string;
  external_urls?: {
    spotify?: string;
  };
  images?: Array<{
    url: string;
    width: number | null;
    height: number | null;
  }>;
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
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
  const refreshToken = getSpotifyRefreshToken();

  if (!refreshToken) {
    throw new Error(
      "Falta SPOTIFY_REFRESH_TOKEN. Autoriza la app una vez para obtenerlo.",
    );
  }

  const tokenResponse = await requestSpotifyToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );

  return tokenResponse.access_token;
}

async function fetchSpotifyJson<T>(input: string, accessToken: string) {
  const response = await fetch(input, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify devolvió ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
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

function mapSpotifyArtistQuickAccess(
  artist: SpotifyArtistResponse,
): SpotifyQuickAccessAsset {
  return {
    id: artist.id,
    label: artist.name.trim(),
    eyebrow: "Perfil",
    href:
      artist.external_urls?.spotify?.trim() ||
      `https://open.spotify.com/artist/${artist.id}`,
    imageUrl: artist.images?.[0]?.url?.trim() || null,
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

function formatDurationLabel(durationMs: number | null) {
  if (!durationMs || durationMs < 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
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

function mapSpotifyPlaylistTrack(
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
  const fallbackId = `${position}-${name.toLocaleLowerCase("es-ES").replace(/\s+/g, "-")}`;

  return {
    id: track.id?.trim() || fallbackId,
    position,
    name,
    artistsLabel,
    albumName,
    albumReleaseDate,
    durationLabel: formatDurationLabel(track.duration_ms),
  } satisfies SpotifyPlaylistTrackAsset;
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

  try {
    const accessToken = await getSpotifyAccessToken();
    const profile = await fetchSpotifyJson<SpotifyProfileResponse>(
      `${SPOTIFY_API_BASE_URL}/me`,
      accessToken,
    );
    const playlists: SpotifyPlaylistResponse[] = [];
    let nextUrl: string | null = `${SPOTIFY_API_BASE_URL}/me/playlists?limit=50`;
    let pageCount = 0;

    while (nextUrl && pageCount < 6) {
      const playlistPage: SpotifyPlaylistPageResponse =
        await fetchSpotifyJson<SpotifyPlaylistPageResponse>(
        nextUrl,
        accessToken,
        );

      playlists.push(...playlistPage.items);
      nextUrl = playlistPage.next;
      pageCount += 1;
    }

    const ownedPlaylists = playlists
      .filter((playlist) => playlist.owner.id === profile.id)
      .map(mapSpotifyPlaylist)
      .sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      );
    const [kintelaArtist, desgarramantasArtist] = await Promise.all([
      fetchSpotifyJson<SpotifyArtistResponse>(
        `${SPOTIFY_API_BASE_URL}/artists/${KINTELA_SPOTIFY_ARTIST_ID}`,
        accessToken,
      ),
      fetchSpotifyJson<SpotifyArtistResponse>(
        `${SPOTIFY_API_BASE_URL}/artists/${DESGARRAMANTAS_SPOTIFY_ARTIST_ID}`,
        accessToken,
      ),
    ]);
    const quickAccess = [
      mapSpotifyArtistQuickAccess(kintelaArtist),
      mapSpotifyArtistQuickAccess(desgarramantasArtist),
      buildLegacyQuickAccess(ownedPlaylists),
    ].filter(
      (asset): asset is SpotifyQuickAccessAsset => asset !== null,
    );

    return {
      playlists: ownedPlaylists,
      quickAccess,
      configured: true,
      connected: true,
      error: null,
      accountName: profile.display_name?.trim() || null,
      loginHref: getSpotifyLoginPath(),
      callbackPath: getSpotifyCallbackPath(),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido leer las playlists de Spotify.";

    return {
      playlists: [],
      quickAccess: [],
      configured: true,
      connected: true,
      error: `No he podido leer Spotify: ${message}`,
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

  const accessToken = await getSpotifyAccessToken();
  const tracks: SpotifyPlaylistTrackAsset[] = [];
  const encodedPlaylistId = encodeURIComponent(normalizedPlaylistId);
  let nextUrl: string | null =
    `${SPOTIFY_API_BASE_URL}/playlists/${encodedPlaylistId}/tracks?limit=100&fields=items(track(id,name,album(name,release_date),artists(name),duration_ms,is_local)),next`;
  let pageCount = 0;
  let position = 1;

  while (nextUrl && pageCount < 10) {
    const trackPage: SpotifyPlaylistTrackPageResponse =
      await fetchSpotifyJson<SpotifyPlaylistTrackPageResponse>(
        nextUrl,
        accessToken,
      );

    for (const item of trackPage.items) {
      const track = mapSpotifyPlaylistTrack(item, position);

      if (!track) {
        continue;
      }

      tracks.push(track);
      position += 1;
    }

    nextUrl = trackPage.next;
    pageCount += 1;
  }

  return [...tracks]
    .sort(compareSpotifyTracks)
    .map((track, index) => ({
      ...track,
      position: index + 1,
    }));
}

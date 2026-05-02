export type SpotifyPlaylistAsset = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string;
  embedUrl: string;
  ownerName: string;
  trackCount: number;
  visibilityLabel: string;
  collaborative: boolean;
};

export type SpotifyQuickAccessAsset = {
  id: string;
  label: string;
  eyebrow: string;
  href: string;
  imageUrl: string | null;
  kind: "artist" | "playlist";
};

export type SpotifyPlaylistTrackAsset = {
  id: string;
  position: number;
  name: string;
  artistsLabel: string;
  albumName: string | null;
  albumReleaseDate: string | null;
  languageCode: string | null;
  durationMs: number | null;
  durationLabel: string;
  youtubeCacheStatus: "cached" | "uncached";
  rating: number;
};

export type SpotifyPlaylistTrackSearchPreviewAsset = {
  trackName: string;
  trackArtistsLabel: string;
};

export type SpotifyPlaylistTrackSearchHitAsset = {
  playlistId: string;
  matchedTrack: SpotifyPlaylistTrackSearchPreviewAsset;
};

export type SpotifyTopicMatchAsset = {
  playlistId: string;
  playlistName: string;
  playlistExternalUrl: string;
  highlightedPlaylistUrl: string;
  trackId: string;
  trackName: string;
  trackArtistsLabel: string;
  trackExternalUrl: string;
};

export type SpotifyPlaylistListResult = {
  playlists: SpotifyPlaylistAsset[];
  quickAccess: SpotifyQuickAccessAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
};

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

export type SpotifyPlaylistListResult = {
  playlists: SpotifyPlaylistAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
};

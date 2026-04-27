export function formatSpotifyDurationLabel(durationMs: number | null) {
  if (!durationMs || durationMs < 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function normalizeSpotifyMatchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .replace(/^the\s+/i, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shouldStripSpotifyTrackSuffix(value: string) {
  const normalizedValue = normalizeSpotifyMatchValue(value);

  if (!normalizedValue) {
    return false;
  }

  return /(remaster|remastered|remix|mix|live|acoustic|demo|edit|version|radio|mono|stereo|deluxe|edition|session|take|alternate|bonus|soundtrack|from|explicit|clean|\b19\d{2}\b|\b20\d{2}\b)/.test(
    normalizedValue,
  );
}

export function canonicalizeSpotifyTrackNameForMatch(value: string) {
  let candidate = value.trim();

  if (!candidate) {
    return "";
  }

  for (const separator of [" - ", " – ", " — ", ": "]) {
    const separatorIndex = candidate.indexOf(separator);

    if (separatorIndex <= 0) {
      continue;
    }

    const suffix = candidate.slice(separatorIndex + separator.length);

    if (shouldStripSpotifyTrackSuffix(suffix)) {
      candidate = candidate.slice(0, separatorIndex).trim();
      break;
    }
  }

  candidate = candidate.replace(
    /\s*[\(\[\{]([^\)\]\}]*)[\)\]\}]\s*$/g,
    (_match, suffix) =>
      shouldStripSpotifyTrackSuffix(String(suffix ?? ""))
        ? " "
        : ` (${String(suffix ?? "").trim()}) `,
  );

  return normalizeSpotifyMatchValue(candidate);
}

export function buildSpotifyTrackExternalUrl(trackId: string) {
  return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
}

export function buildSpotifyHighlightedPlaylistUrl(
  playlistExternalUrl: string,
  trackId: string,
) {
  const highlightedUrl = new URL(playlistExternalUrl);
  highlightedUrl.searchParams.set("highlight", `spotify:track:${trackId}`);

  return highlightedUrl.toString();
}

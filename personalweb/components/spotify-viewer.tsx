"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import { YouTubeEmbeddedPlayer } from "@/components/youtube-embedded-player";
import type {
  SpotifyPlaylistAsset,
  SpotifyQuickAccessAsset,
  SpotifyPlaylistTrackAsset,
} from "@/lib/spotify-types";
import type { YouTubeMatchedVideoAsset } from "@/lib/youtube-types";

type SpotifyViewerProps = {
  playlists: SpotifyPlaylistAsset[];
  quickAccess: SpotifyQuickAccessAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
  filterValue: string;
  initiallyAdminUnlocked: boolean;
};

type SpotifyPlaylistTracksPayload = {
  tracks?: SpotifyPlaylistTrackAsset[];
  error?: string;
};

type YouTubeMatchPayload = {
  ok?: boolean;
  video?: YouTubeMatchedVideoAsset | null;
  error?: string;
};

type SpotifyTrackStatus = "idle" | "loading" | "ready" | "error";

const SPOTIFY_VIEWER_GRID_STORAGE_KEY = "spotify-viewer-grid-density";
function getPlaylistCountLabel(count: number) {
  return `${count} lista${count === 1 ? "" : "s"}`;
}

function getTrackCountLabel(count: number) {
  return `${count} tema${count === 1 ? "" : "s"}`;
}

function shuffleTrackOrder(
  tracks: SpotifyPlaylistTrackAsset[],
  selectedTrackId?: string,
) {
  const remainingTrackIds = tracks.map((track) => track.id);
  const nextTrackIds: string[] = [];

  if (selectedTrackId) {
    const selectedTrackIndex = remainingTrackIds.indexOf(selectedTrackId);

    if (selectedTrackIndex >= 0) {
      nextTrackIds.push(selectedTrackId);
      remainingTrackIds.splice(selectedTrackIndex, 1);
    }
  }

  for (let index = remainingTrackIds.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = remainingTrackIds[index];

    remainingTrackIds[index] = remainingTrackIds[randomIndex] ?? currentValue;
    remainingTrackIds[randomIndex] = currentValue;
  }

  return [...nextTrackIds, ...remainingTrackIds];
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 translate-x-[1px]"
    >
      <path d="M8 6.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 7h10" />
      <path d="M4 12h10" />
      <path d="M4 17h7" />
      <path d="m16 14 4 3-4 3v-6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArtistIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function VideoPlaceholderIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m10 9.25 5 2.75-5 2.75v-5.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ManualVideoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3.5" y="7" width="11" height="10" rx="2.2" />
      <path d="m14.5 10 4 2.5-4 2.5Z" fill="currentColor" stroke="none" />
      <path d="M18 4.5v4" />
      <path d="M16 6.5h4" />
    </svg>
  );
}

export function SpotifyViewer({
  playlists,
  quickAccess,
  configured,
  connected,
  error,
  accountName,
  loginHref,
  callbackPath,
  filterValue,
  initiallyAdminUnlocked,
}: SpotifyViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedSpotifyPlaylistId = searchParams.get("spotifyPlaylist")?.trim() ?? "";
  const sharedSpotifyTrackId = searchParams.get("spotifyTrack")?.trim() ?? "";
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    SPOTIFY_VIEWER_GRID_STORAGE_KEY,
  );
  const [filterInput, setFilterInput] = useState(filterValue);
  const [isClient, setIsClient] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyPlaylistTrackAsset[]>(
    [],
  );
  const [trackCache, setTrackCache] = useState<
    Record<string, SpotifyPlaylistTrackAsset[]>
  >({});
  const [trackFilterInput, setTrackFilterInput] = useState("");
  const [isTrackShuffleEnabled, setIsTrackShuffleEnabled] = useState(false);
  const [shuffledTrackIds, setShuffledTrackIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [trackStatus, setTrackStatus] = useState<SpotifyTrackStatus>("idle");
  const [trackError, setTrackError] = useState<string | null>(null);
  const [videoCache, setVideoCache] = useState<
    Record<string, YouTubeMatchedVideoAsset | null>
  >({});
  const [selectedVideo, setSelectedVideo] =
    useState<YouTubeMatchedVideoAsset | null>(null);
  const [videoStatus, setVideoStatus] = useState<SpotifyTrackStatus>("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoExtendedMode, setIsVideoExtendedMode] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    initiallyAdminUnlocked,
  );
  const [isManualVideoPanelOpen, setIsManualVideoPanelOpen] = useState(false);
  const [manualVideoPassword, setManualVideoPassword] = useState("");
  const [manualVideoUrl, setManualVideoUrl] = useState("");
  const [manualVideoError, setManualVideoError] = useState("");
  const [manualVideoSuccess, setManualVideoSuccess] = useState("");
  const [isManualVideoUnlocking, setIsManualVideoUnlocking] = useState(false);
  const [isManualVideoSaving, setIsManualVideoSaving] = useState(false);
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        : "grid gap-5 xl:grid-cols-2 2xl:grid-cols-3";
  const normalizedFilterValue = filterInput.trim().toLocaleLowerCase("es-ES");
  const filteredPlaylists = normalizedFilterValue
    ? playlists.filter((playlist) => {
        const haystack = [playlist.name, playlist.description]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es-ES");

        return haystack.includes(normalizedFilterValue);
      })
    : playlists;
  const normalizedTrackFilterValue = trackFilterInput
    .trim()
    .toLocaleLowerCase("es-ES");
  const filteredPlaylistTracks = normalizedTrackFilterValue
    ? playlistTracks.filter((track) => {
        const haystack = [
          track.name,
          track.artistsLabel,
          track.albumName,
          track.albumReleaseDate ? track.albumReleaseDate.slice(0, 4) : null,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es-ES");

        return haystack.includes(normalizedTrackFilterValue);
      })
    : playlistTracks;
  const playbackOrderedTracks = (() => {
    if (!isTrackShuffleEnabled || shuffledTrackIds.length === 0) {
      return filteredPlaylistTracks;
    }

    const orderedTracks = shuffledTrackIds
      .map((trackId) =>
        filteredPlaylistTracks.find((track) => track.id === trackId) ?? null,
      )
      .filter((track): track is SpotifyPlaylistTrackAsset => track !== null);

    if (orderedTracks.length === filteredPlaylistTracks.length) {
      return orderedTracks;
    }

    const orderedTrackIdSet = new Set(orderedTracks.map((track) => track.id));
    const missingTracks = filteredPlaylistTracks.filter(
      (track) => !orderedTrackIdSet.has(track.id),
    );

    return [...orderedTracks, ...missingTracks];
  })();
  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;
  const selectedTrack =
    playbackOrderedTracks.find((track) => track.id === selectedTrackId) ??
    playbackOrderedTracks[0] ??
    null;
  const selectedTrackYear = selectedTrack?.albumReleaseDate?.slice(0, 4) ?? null;
  const selectedPlaylistViewerAnchorId = selectedPlaylist
    ? `spotify-playlist-viewer-${selectedPlaylist.id}`
    : "";
  const selectedTrackAnchorId = selectedTrack
    ? `spotify-track-${selectedTrack.id}`
    : "";
  const selectedTrackIndex = selectedTrack
    ? playbackOrderedTracks.findIndex((track) => track.id === selectedTrack.id)
    : -1;
  const hasPreviousTrack = selectedTrackIndex > 0;
  const hasNextTrack =
    selectedTrackIndex >= 0 &&
    selectedTrackIndex < playbackOrderedTracks.length - 1;

  const applyFilter = useEffectEvent((nextFilterValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedValue = nextFilterValue.trim();

    if (normalizedValue) {
      params.set("spotifyFilter", normalizedValue);
    } else {
      params.delete("spotifyFilter");
    }

    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  });

  async function requestNativeFullscreen() {
    if (typeof document === "undefined") {
      return;
    }

    if (document.fullscreenElement) {
      setIsNativeFullscreen(true);
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      setIsNativeFullscreen(true);
    } catch {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }
  }

  async function exitNativeFullscreen() {
    if (typeof document === "undefined" || !document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      return;
    }
  }

  function resetPlaylistViewerState() {
    setSelectedPlaylistId(null);
    setPlaylistTracks([]);
    setTrackFilterInput("");
    setIsTrackShuffleEnabled(false);
    setShuffledTrackIds([]);
    setSelectedTrackId("");
    setTrackStatus("idle");
    setTrackError(null);
    setSelectedVideo(null);
    setVideoStatus("idle");
    setVideoError(null);
    setIsVideoExtendedMode(true);
    setIsManualVideoPanelOpen(false);
    setManualVideoPassword("");
    setManualVideoUrl("");
    setManualVideoError("");
    setManualVideoSuccess("");
    setIsManualVideoUnlocking(false);
    setIsManualVideoSaving(false);
  }

  function clearSpotifyShareParams() {
    const params = new URLSearchParams(searchParams.toString());
    let didChange = false;

    for (const key of ["spotifyPlaylist", "spotifyTrack", "focus"]) {
      if (!params.has(key)) {
        continue;
      }

      params.delete(key);
      didChange = true;
    }

    const currentHash = decodeURIComponent(window.location.hash.slice(1));
    const shouldResetHash =
      currentHash.startsWith("spotify-playlist-viewer-") ||
      currentHash.startsWith("spotify-track-");

    if (!didChange && !shouldResetHash) {
      return;
    }

    const query = params.toString();
    const hash = shouldResetHash ? "#spotify" : window.location.hash;

    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, {
        scroll: false,
      });
    });
  }

  function handleClosePlaylistViewer() {
    void exitNativeFullscreen();
    resetPlaylistViewerState();
    clearSpotifyShareParams();
  }

  const handleClosePlaylistViewerEffect = useEffectEvent(() => {
    handleClosePlaylistViewer();
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setIsAdminUnlocked(initiallyAdminUnlocked);
  }, [initiallyAdminUnlocked]);

  useEffect(() => {
    setIsVideoExtendedMode(true);
    setIsManualVideoPanelOpen(false);
    setManualVideoPassword("");
    setManualVideoUrl("");
    setManualVideoError("");
    setManualVideoSuccess("");
    setIsManualVideoUnlocking(false);
    setIsManualVideoSaving(false);
  }, [selectedTrack?.id]);

  useEffect(() => {
    if (!sharedSpotifyPlaylistId) {
      return;
    }

    if (!playlists.some((playlist) => playlist.id === sharedSpotifyPlaylistId)) {
      return;
    }

    setSelectedPlaylistId(sharedSpotifyPlaylistId);
    setTrackFilterInput("");
    setIsTrackShuffleEnabled(false);
    setShuffledTrackIds([]);
    setIsVideoExtendedMode(true);
  }, [playlists, sharedSpotifyPlaylistId]);

  useEffect(() => {
    const currentValue = filterValue.trim();
    const nextValue = filterInput.trim();

    if (currentValue === nextValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      applyFilter(filterInput);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [filterInput, filterValue]);

  useEffect(() => {
    if (!selectedPlaylist) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPlaylist]);

  useEffect(() => {
    if (!selectedPlaylist) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClosePlaylistViewerEffect();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlaylist]);

  useEffect(() => {
    if (!selectedPlaylist) {
      return;
    }

    const hasCachedTracks = Object.prototype.hasOwnProperty.call(
      trackCache,
      selectedPlaylist.id,
    );

    if (hasCachedTracks) {
      setPlaylistTracks(trackCache[selectedPlaylist.id] ?? []);
      setTrackStatus("ready");
      setTrackError(null);
      return;
    }

    const abortController = new AbortController();
    setPlaylistTracks([]);
    setSelectedTrackId("");
    setTrackStatus("loading");
    setTrackError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/spotify/playlists/${encodeURIComponent(selectedPlaylist.id)}/tracks`,
          {
            method: "GET",
            signal: abortController.signal,
            cache: "no-store",
          },
        );
        const payload =
          (await response.json()) as SpotifyPlaylistTracksPayload;

        if (!response.ok) {
          throw new Error(
            payload.error ||
              "No he podido leer las canciones de esta playlist.",
          );
        }

        const nextTracks = Array.isArray(payload.tracks) ? payload.tracks : [];

        setTrackCache((currentCache) => ({
          ...currentCache,
          [selectedPlaylist.id]: nextTracks,
        }));
        setPlaylistTracks(nextTracks);
        setTrackStatus("ready");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setTrackError(
          error instanceof Error
            ? error.message
            : "No he podido leer las canciones de esta playlist.",
        );
        setTrackStatus("error");
      }
    })();

    return () => abortController.abort();
  }, [selectedPlaylist, trackCache]);

  useEffect(() => {
    if (!isTrackShuffleEnabled) {
      setShuffledTrackIds([]);
      return;
    }

    setShuffledTrackIds((currentTrackIds) => {
      const visibleTrackIdSet = new Set(
        filteredPlaylistTracks.map((track) => track.id),
      );
      const nextTrackIds = currentTrackIds.filter((trackId) =>
        visibleTrackIdSet.has(trackId),
      );
      const missingTrackIds = filteredPlaylistTracks
        .map((track) => track.id)
        .filter((trackId) => !nextTrackIds.includes(trackId));

      if (nextTrackIds.length === filteredPlaylistTracks.length) {
        return nextTrackIds;
      }

      return [
        ...nextTrackIds,
        ...shuffleTrackOrder(
          filteredPlaylistTracks.filter((track) =>
            missingTrackIds.includes(track.id),
          ),
        ),
      ];
    });
  }, [filteredPlaylistTracks, isTrackShuffleEnabled]);

  useEffect(() => {
    if (!selectedPlaylist) {
      setSelectedTrackId("");
      return;
    }

    if (sharedSpotifyTrackId) {
      if (playbackOrderedTracks.length === 0) {
        setSelectedTrackId(sharedSpotifyTrackId);
        return;
      }

      if (
        playbackOrderedTracks.some((track) => track.id === sharedSpotifyTrackId)
      ) {
        setSelectedTrackId(sharedSpotifyTrackId);
        return;
      }
    }

    if (playbackOrderedTracks.length === 0) {
      setSelectedTrackId("");
      return;
    }

    setSelectedTrackId((currentTrackId) => {
      if (
        currentTrackId &&
        playbackOrderedTracks.some((track) => track.id === currentTrackId)
      ) {
        return currentTrackId;
      }

      return playbackOrderedTracks[0]?.id ?? "";
    });
  }, [playbackOrderedTracks, selectedPlaylist, sharedSpotifyTrackId]);

  useEffect(() => {
    if (!selectedTrack) {
      setSelectedVideo(null);
      setVideoStatus("idle");
      setVideoError(null);
      return;
    }

    const hasCachedVideo = Object.prototype.hasOwnProperty.call(
      videoCache,
      selectedTrack.id,
    );

    if (hasCachedVideo) {
      setSelectedVideo(videoCache[selectedTrack.id] ?? null);
      setVideoStatus("ready");
      setVideoError(null);
      return;
    }

    const abortController = new AbortController();
    setSelectedVideo(null);
    setVideoStatus("loading");
    setVideoError(null);

    void (async () => {
      try {
        const query = new URLSearchParams({
          track: selectedTrack.name,
          artists: selectedTrack.artistsLabel,
          album: selectedTrack.albumName ?? "",
          year: selectedTrack.albumReleaseDate?.slice(0, 4) ?? "",
        });
        const response = await fetch(`/api/youtube/match?${query.toString()}`, {
          method: "GET",
          signal: abortController.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as YouTubeMatchPayload;

        if (!response.ok) {
          throw new Error(
            payload.error || "No he podido buscar el vídeo en YouTube.",
          );
        }

        const nextVideo = payload.video ?? null;

        setVideoCache((currentCache) => ({
          ...currentCache,
          [selectedTrack.id]: nextVideo,
        }));
        setSelectedVideo(nextVideo);
        setVideoStatus("ready");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setVideoError(
          error instanceof Error
            ? error.message
            : "No he podido buscar el vídeo en YouTube.",
        );
        setVideoStatus("error");
      }
    })();

    return () => abortController.abort();
  }, [selectedTrack, videoCache]);

  function handleReset() {
    setFilterInput("");
  }

  function handleOpenPlaylistViewer(playlistId: string) {
    setSelectedPlaylistId(playlistId);
    setTrackFilterInput("");
    setIsTrackShuffleEnabled(false);
    setShuffledTrackIds([]);
    setIsVideoExtendedMode(true);
    void requestNativeFullscreen();
  }

  function handleSelectTrack(trackId: string) {
    setSelectedTrackId(trackId);

    if (isVideoExtendedMode) {
      void requestNativeFullscreen();
    }
  }

  function handleToggleVideoExtendedMode() {
    setIsVideoExtendedMode((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        void requestNativeFullscreen();
      } else {
        void exitNativeFullscreen();
      }

      return nextValue;
    });
  }

  function handleStepTrack(direction: "previous" | "next") {
    setSelectedTrackId((currentTrackId) => {
      if (!currentTrackId || playbackOrderedTracks.length === 0) {
        return currentTrackId;
      }

      const currentTrackIndex = playbackOrderedTracks.findIndex(
        (track) => track.id === currentTrackId,
      );

      if (currentTrackIndex < 0) {
        return currentTrackId;
      }

      const nextTrack =
        direction === "next"
          ? playbackOrderedTracks[currentTrackIndex + 1]
          : playbackOrderedTracks[currentTrackIndex - 1];

      return nextTrack?.id ?? currentTrackId;
    });
  }

  function handleAdvanceToNextTrack(options?: { requestFullscreen?: boolean }) {
    if (options?.requestFullscreen) {
      void requestNativeFullscreen();
    }

    handleStepTrack("next");
  }

  function handleGoToPreviousTrack(options?: { requestFullscreen?: boolean }) {
    if (options?.requestFullscreen) {
      void requestNativeFullscreen();
    }

    handleStepTrack("previous");
  }

  function handleToggleTrackShuffle() {
    setIsTrackShuffleEnabled((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setShuffledTrackIds(
          shuffleTrackOrder(filteredPlaylistTracks, selectedTrackId),
        );
      } else {
        setShuffledTrackIds([]);
      }

      return nextValue;
    });
  }

  function handleToggleManualVideoPanel() {
    setIsManualVideoPanelOpen((currentValue) => !currentValue);
    setManualVideoError("");
    setManualVideoSuccess("");
  }

  async function unlockSpotifyAdminSession(password: string) {
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "No he podido validar la contraseña admin.");
    }

    setIsAdminUnlocked(true);
  }

  async function handleUnlockManualVideo(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsManualVideoUnlocking(true);
    setManualVideoError("");
    setManualVideoSuccess("");

    try {
      await unlockSpotifyAdminSession(manualVideoPassword);
      setManualVideoPassword("");
    } catch (error) {
      setManualVideoError(
        error instanceof Error
          ? error.message
          : "No he podido validar la contraseña admin.",
      );
    } finally {
      setIsManualVideoUnlocking(false);
    }
  }

  async function handleSaveManualVideo(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedTrack) {
      setManualVideoError("Selecciona primero una canción.");
      return;
    }

    if (!manualVideoUrl.trim()) {
      setManualVideoError("Pega un enlace de YouTube antes de guardar.");
      return;
    }

    setIsManualVideoSaving(true);
    setManualVideoError("");
    setManualVideoSuccess("");

    try {
      const response = await fetch("/api/youtube/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track: selectedTrack.name,
          artists: selectedTrack.artistsLabel,
          album: selectedTrack.albumName ?? "",
          year: selectedTrackYear ?? "",
          youtubeUrl: manualVideoUrl.trim(),
        }),
      });
      const payload = (await response.json()) as YouTubeMatchPayload;

      if (!response.ok || !payload.ok || !payload.video) {
        if (response.status === 401) {
          setIsAdminUnlocked(false);
        }

        throw new Error(
          payload.error ?? "No he podido guardar el vídeo manual.",
        );
      }

      setVideoCache((currentCache) => ({
        ...currentCache,
        [selectedTrack.id]: payload.video ?? null,
      }));
      setSelectedVideo(payload.video);
      setVideoStatus("ready");
      setVideoError(null);
      setManualVideoSuccess("Vídeo manual guardado en la caché.");
      setManualVideoUrl("");
    } catch (error) {
      setManualVideoError(
        error instanceof Error
          ? error.message
          : "No he podido guardar el vídeo manual.",
      );
    } finally {
      setIsManualVideoSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Spotify
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Me flipan...
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton
              anchorId="spotify"
              queryKeys={["spotifyFilter"]}
              className="shrink-0"
            />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span>
                {configured && connected
                  ? `${getPlaylistCountLabel(filteredPlaylists.length)}${accountName ? ` de ${accountName}` : ""}`
                  : "Integración lista para conectar"}
              </span>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm leading-7 text-amber-100">
            Faltan variables de entorno de Spotify. Añade
            <span className="font-semibold text-white">
              {" "}
              `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` y
              `SPOTIFY_REDIRECT_URI`
            </span>
            .
          </div>
        ) : !connected ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/75">
                  Conexión
                </p>
                <h3 className="text-2xl font-semibold tracking-tight text-white">
                  Falta autorizar una vez tu cuenta
                </h3>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  La parte de código ya está preparada. Ahora necesitas sacar el
                  `refresh token` para que la web pueda leer tus playlists
                  propias.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
                  <p>
                    Redirect local que debes registrar en Spotify:
                    <span className="font-semibold text-white">
                      {" "}
                      `http://127.0.0.1:3000{callbackPath}`
                    </span>
                  </p>
                  <p>
                    Redirect de producción:
                    <span className="font-semibold text-white">
                      {" "}
                      `https://www.kintela.es{callbackPath}`
                    </span>
                  </p>
                  <p>
                    Spotify ya no acepta `localhost` como redirect URI en este
                    caso; usa `127.0.0.1`.
                  </p>
                </div>

                <a
                  href={loginHref}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 text-sm font-medium uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-300/18 hover:text-white"
                >
                  Conectar Spotify
                </a>
              </div>
            </div>
          </div>
        ) : error && playlists.length === 0 ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            La conexión con Spotify está hecha, pero no he encontrado playlists
            propias para mostrar.
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                    Filtro
                  </p>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                    <input
                      type="search"
                      value={filterInput}
                      onChange={(event) => setFilterInput(event.target.value)}
                      placeholder="Buscar por nombre o descripción..."
                      className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                    />

                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-2xl border border-white/12 bg-black/20 px-6 py-4 text-base text-slate-100 transition hover:border-white/25 hover:text-white"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {filterInput.trim() ? (
                  <p className="text-sm text-slate-300">
                    {filteredPlaylists.length} playlists encontradas para{" "}
                    <span className="font-semibold text-white">
                      {filterInput.trim()}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                {quickAccess.map((accessLink) => (
                  <a
                    key={accessLink.id}
                    href={accessLink.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white/6 text-slate-100 transition group-hover:border-cyan-300/50 group-hover:text-white">
                      {accessLink.imageUrl ? (
                        <Image
                          src={accessLink.imageUrl}
                          alt={`Imagen de ${accessLink.label}`}
                          width={44}
                          height={44}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : accessLink.kind === "artist" ? (
                        <ArtistIcon />
                      ) : (
                        <PlaylistIcon />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block text-[0.68rem] uppercase tracking-[0.28em] text-cyan-300/80">
                        {accessLink.eyebrow}
                      </span>
                      <span className="block truncate text-base font-semibold text-white">
                        {accessLink.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xl text-cyan-200 transition group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <GridDensityControls
                gridDensity={gridDensity}
                setGridDensity={setGridDensity}
                compactTitle="Activar vista compacta de playlists"
                denseTitle="Activar vista densa de playlists"
              />
            </div>

            {filteredPlaylists.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
                No hay playlists que coincidan con ese filtro.
              </div>
            ) : (
              <div className={gridClassName}>
                {filteredPlaylists.map((playlist) => {
                  const anchorId = `spotify-playlist-${playlist.id}`;

                  return (
                    <article
                      key={playlist.id}
                      id={anchorId}
                      className="group relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                    >
                      <ShareCardButton
                        anchorId={`spotify-playlist-viewer-${playlist.id}`}
                        sectionId="spotify"
                        queryValues={{ spotifyPlaylist: playlist.id }}
                        className="absolute right-4 top-4 z-10"
                      />

                      <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                        {playlist.imageUrl ? (
                          <Image
                            src={playlist.imageUrl}
                            alt={`Portada de ${playlist.name}`}
                            fill
                            unoptimized
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            sizes="(max-width: 1280px) 100vw, (max-width: 1536px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-8 text-center text-sm uppercase tracking-[0.3em] text-slate-400">
                            Spotify
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                            {playlist.trackCount} temas
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPlaylistViewer(playlist.id)}
                              aria-label={`Abrir canciones de ${playlist.name}`}
                              title={`Abrir canciones de ${playlist.name}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-slate-100 transition hover:border-cyan-300/55 hover:bg-cyan-300/12 hover:text-white"
                            >
                              <PlaylistIcon />
                            </button>
                            <a
                              href={playlist.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Escuchar ${playlist.name} en Spotify`}
                              title={`Escuchar ${playlist.name} en Spotify`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/12 text-emerald-100 transition hover:border-emerald-300/65 hover:bg-emerald-300/18 hover:text-white"
                            >
                              <PlayIcon />
                            </a>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-2xl font-semibold leading-tight text-white">
                            {playlist.name}
                          </h3>
                          {playlist.description ? (
                            <p className="text-sm leading-7 text-slate-300">
                              {playlist.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-auto pt-1" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {isClient && selectedPlaylist
        ? createPortal(
            <div
              className={`fixed inset-0 z-[100] ${
                isNativeFullscreen ? "bg-black" : "bg-slate-950/92 backdrop-blur-sm"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label={`Canciones de ${selectedPlaylist.name}`}
            >
              <button
                type="button"
                aria-label="Cerrar visor de playlist"
                className="absolute inset-0 cursor-default"
                onClick={handleClosePlaylistViewer}
              />

              <div
                className={`relative z-10 h-full ${
                  isNativeFullscreen ? "overflow-hidden p-0" : "overflow-y-auto px-4 py-6"
                }`}
              >
                <div
                  className={`mx-auto flex w-full items-start justify-center ${
                    isNativeFullscreen
                      ? "h-full max-w-none"
                      : isVideoExtendedMode
                        ? "min-h-full max-w-none"
                        : "min-h-full max-w-7xl"
                  }`}
                >
                  <div className={`flex w-full flex-col ${isNativeFullscreen ? "h-full gap-0" : "gap-4"}`}>
                    {!isNativeFullscreen ? (
                      <div
                        id={selectedPlaylistViewerAnchorId}
                        className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {selectedPlaylist.name}
                          </p>
                          <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                            {selectedPlaylist.trackCount} temas
                            {selectedTrack ? ` · ${selectedTrack.name}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <ShareCardButton
                            anchorId={selectedPlaylistViewerAnchorId}
                            sectionId="spotify"
                            queryValues={{ spotifyPlaylist: selectedPlaylist.id }}
                          />
                          <a
                            href={selectedPlaylist.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-emerald-300/45 hover:text-white"
                          >
                            Abrir en Spotify
                          </a>
                          <button
                            type="button"
                            onClick={handleClosePlaylistViewer}
                            className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={
                        isNativeFullscreen
                          ? "grid h-full gap-0"
                          : isVideoExtendedMode
                          ? "grid gap-4"
                          : "grid gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
                      }
                    >
                      {!isNativeFullscreen && !isVideoExtendedMode ? (
                        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                                Canciones
                              </p>
                              <button
                                type="button"
                                onClick={handleToggleTrackShuffle}
                                className={`rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] transition ${
                                  isTrackShuffleEnabled
                                    ? "border-cyan-300/55 bg-cyan-300/12 text-cyan-100"
                                    : "border-white/12 bg-white/6 text-slate-200 hover:border-cyan-300/35 hover:text-white"
                                }`}
                              >
                                Aleatorio
                              </button>
                            </div>
                            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                              {getTrackCountLabel(
                                playbackOrderedTracks.length ||
                                  (normalizedTrackFilterValue
                                    ? 0
                                    : selectedPlaylist.trackCount),
                              )}
                            </span>
                          </div>

                          <div className="border-b border-white/10 px-3 py-3">
                            <input
                              type="search"
                              value={trackFilterInput}
                              onChange={(event) =>
                                setTrackFilterInput(event.target.value)
                              }
                              placeholder="Filtrar por tema, grupo, disco o año..."
                              className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                            />
                          </div>

                          <div className="max-h-[70vh] overflow-y-auto p-3">
                            {trackStatus === "loading" ? (
                              <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                                Cargando canciones de Spotify...
                              </div>
                            ) : trackStatus === "error" ? (
                              <div className="rounded-[1.35rem] border border-rose-400/25 bg-rose-400/10 px-4 py-6 text-sm leading-7 text-rose-100">
                                {trackError ||
                                  "No he podido leer las canciones de esta playlist."}
                              </div>
                            ) : playlistTracks.length === 0 ? (
                              <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                                Esta playlist no devuelve canciones utilizables
                                desde la API de Spotify.
                              </div>
                            ) : playbackOrderedTracks.length === 0 ? (
                              <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                                No hay canciones que coincidan con ese filtro.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {playbackOrderedTracks.map((track) => {
                                  const isSelected = selectedTrack?.id === track.id;

                                  return (
                                    <button
                                      key={track.id}
                                      id={`spotify-track-${track.id}`}
                                      type="button"
                                      onClick={() => handleSelectTrack(track.id)}
                                      className={`flex w-full items-start justify-between gap-3 rounded-[1.35rem] border px-4 py-4 text-left transition ${
                                        isSelected
                                          ? "border-cyan-300/55 bg-cyan-300/12"
                                          : "border-white/10 bg-white/6 hover:border-cyan-300/35 hover:bg-cyan-300/8"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                          <span className="shrink-0">
                                            Pista {track.position}
                                          </span>
                                          <span className="truncate text-slate-300">
                                            {track.artistsLabel}
                                          </span>
                                        </div>
                                        <p className="mt-2 truncate text-base font-semibold text-white">
                                          {track.name}
                                        </p>
                                        {track.albumName ? (
                                          <p
                                            className="mt-1 truncate text-sm text-cyan-100/80"
                                            title={`${track.albumName}${track.albumReleaseDate ? ` · ${track.albumReleaseDate.slice(0, 4)}` : ""}`}
                                          >
                                            {track.albumName}
                                            {track.albumReleaseDate
                                              ? ` · ${track.albumReleaseDate.slice(0, 4)}`
                                              : ""}
                                          </p>
                                        ) : null}
                                      </div>
                                      <span className="shrink-0 rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                                        {track.durationLabel}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div
                        className={`overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.38)] ${
                          isNativeFullscreen
                            ? "h-full rounded-none border-0 bg-black shadow-none"
                            : isVideoExtendedMode
                            ? "flex min-h-[calc(100vh-11rem)] flex-col"
                            : ""
                        }`}
                      >
                        {!isNativeFullscreen ? (
                          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                                Visor
                              </p>
                              {selectedTrack ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                  <p>
                                    {selectedTrack.name} · {selectedTrack.artistsLabel}
                                  </p>
                                  {selectedTrackYear ? (
                                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-cyan-100">
                                      {selectedTrackYear}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-slate-300">
                                  Selecciona una canción para preparar el visor del
                                  vídeo.
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleToggleVideoExtendedMode}
                                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/45 hover:text-white"
                              >
                                {isVideoExtendedMode ? "Lista" : "Extendido"}
                              </button>
                              {selectedTrack ? (
                                <button
                                  type="button"
                                  onClick={handleToggleManualVideoPanel}
                                  aria-label={
                                    isManualVideoPanelOpen
                                      ? "Cerrar formulario de vídeo manual"
                                      : "Añadir vídeo manualmente"
                                  }
                                  title={
                                    isManualVideoPanelOpen
                                      ? "Cerrar formulario de vídeo manual"
                                      : "Añadir vídeo manualmente"
                                  }
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                                    isManualVideoPanelOpen
                                      ? "border-cyan-300/55 bg-cyan-300/14 text-cyan-100"
                                      : "border-white/12 bg-white/6 text-slate-100 hover:border-cyan-300/45 hover:text-white"
                                  }`}
                                >
                                  <ManualVideoIcon />
                                </button>
                              ) : null}
                              {selectedTrack ? (
                                <ShareCardButton
                                  anchorId={selectedTrackAnchorId}
                                  sectionId="spotify"
                                  queryValues={{
                                    spotifyPlaylist: selectedPlaylist.id,
                                    spotifyTrack: selectedTrack.id,
                                  }}
                                />
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  handleGoToPreviousTrack({ requestFullscreen: true })
                                }
                                disabled={!hasPreviousTrack}
                                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Anterior
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdvanceToNextTrack({ requestFullscreen: true })
                                }
                                disabled={!hasNextTrack}
                                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Siguiente
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {selectedTrack && isManualVideoPanelOpen && !isNativeFullscreen ? (
                          <div className="border-b border-white/10 px-5 py-4">
                            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_55%),rgba(8,15,31,0.72)] p-4">
                              {!isAdminUnlocked ? (
                                <form
                                  className="space-y-4"
                                  onSubmit={handleUnlockManualVideo}
                                >
                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                                      Vídeo manual
                                    </p>
                                    <p className="text-sm text-slate-300">
                                      Introduce la contraseña admin para
                                      sustituir el vídeo cacheado de{" "}
                                      <span className="font-medium text-white">
                                        {selectedTrack.name}
                                      </span>
                                      .
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                    <input
                                      type="password"
                                      value={manualVideoPassword}
                                      onChange={(event) =>
                                        setManualVideoPassword(event.target.value)
                                      }
                                      className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                      placeholder="Contraseña admin"
                                      autoComplete="current-password"
                                      required
                                    />
                                    <button
                                      type="submit"
                                      disabled={isManualVideoUnlocking}
                                      className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isManualVideoUnlocking
                                        ? "Validando..."
                                        : "Desbloquear"}
                                    </button>
                                  </div>

                                  {manualVideoError ? (
                                    <p className="text-sm text-rose-200">
                                      {manualVideoError}
                                    </p>
                                  ) : null}
                                </form>
                              ) : (
                                <form
                                  className="space-y-4"
                                  onSubmit={handleSaveManualVideo}
                                >
                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                                      Vídeo manual
                                    </p>
                                    <p className="text-sm text-slate-300">
                                      Pega un enlace de YouTube para reemplazar
                                      el vídeo guardado de{" "}
                                      <span className="font-medium text-white">
                                        {selectedTrack.name}
                                      </span>
                                      . Acepta enlaces de YouTube o el ID del
                                      vídeo.
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                                    <input
                                      type="text"
                                      value={manualVideoUrl}
                                      onChange={(event) =>
                                        setManualVideoUrl(event.target.value)
                                      }
                                      className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      inputMode="url"
                                      required
                                    />
                                    <button
                                      type="submit"
                                      disabled={isManualVideoSaving}
                                      className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isManualVideoSaving
                                        ? "Guardando..."
                                        : "Guardar vídeo"}
                                    </button>
                                  </div>

                                  {manualVideoSuccess ? (
                                    <p className="text-sm text-emerald-200">
                                      {manualVideoSuccess}
                                    </p>
                                  ) : null}
                                  {manualVideoError ? (
                                    <p className="text-sm text-rose-200">
                                      {manualVideoError}
                                    </p>
                                  ) : null}
                                </form>
                              )}
                            </div>
                          </div>
                        ) : null}

                        <div
                          className={`flex flex-col gap-6 p-6 ${
                            isNativeFullscreen
                              ? "h-full min-h-0 flex-1 gap-0 p-0"
                              : isVideoExtendedMode
                              ? "min-h-0 flex-1"
                              : "min-h-[28rem]"
                          }`}
                        >
                          {videoStatus === "loading" ? (
                            <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-cyan-300/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_52%),rgba(2,6,23,0.72)] p-6">
                              <div className="mx-auto max-w-xl text-center">
                                <div className="flex justify-center text-cyan-200">
                                  <VideoPlaceholderIcon />
                                </div>
                                <p className="mt-5 text-sm font-medium uppercase tracking-[0.28em] text-cyan-300/80">
                                  Buscando en YouTube
                                </p>
                                <h3 className="mt-3 text-2xl font-semibold text-white">
                                  Estoy localizando el mejor vídeo para esta canción
                                </h3>
                              </div>
                            </div>
                          ) : videoStatus === "error" ? (
                            <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 p-6">
                              <div className="mx-auto max-w-xl text-center">
                                <p className="text-sm font-medium uppercase tracking-[0.28em] text-rose-200">
                                  Error de YouTube
                                </p>
                                <p className="mt-4 text-sm leading-7 text-rose-100">
                                  {videoError || "No he podido buscar el vídeo en YouTube."}
                                </p>
                              </div>
                            </div>
                          ) : selectedVideo ? (
                            <div
                              className={
                                isVideoExtendedMode
                                  ? "flex min-h-0 flex-1 flex-col"
                                  : "space-y-4"
                              }
                            >
                              <div
                                className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.38)] ${
                                  isVideoExtendedMode ? "min-h-0 flex-1" : ""
                                }`}
                              >
                                <div className={isVideoExtendedMode ? "h-full" : "aspect-video"}>
                                  <YouTubeEmbeddedPlayer
                                    videoId={selectedVideo.id}
                                    title={selectedVideo.title}
                                    autoplay
                                    onEnded={handleAdvanceToNextTrack}
                                    className="h-full w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-cyan-300/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_52%),rgba(2,6,23,0.72)] p-6">
                              <div className="mx-auto max-w-xl text-center">
                                <div className="flex justify-center text-cyan-200">
                                  <VideoPlaceholderIcon />
                                </div>
                                <p className="mt-5 text-sm font-medium uppercase tracking-[0.28em] text-cyan-300/80">
                                  Sin resultado sólido
                                </p>
                                <h3 className="mt-3 text-2xl font-semibold text-white">
                                  No he encontrado un vídeo convincente
                                </h3>
                                <p className="mt-4 text-sm leading-7 text-slate-300">
                                  Prueba con otra canción de la lista. Si hace
                                  falta, luego afinamos el criterio de búsqueda.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

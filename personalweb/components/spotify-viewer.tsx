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
import type {
  SpotifyPlaylistAsset,
  SpotifyPlaylistTrackAsset,
} from "@/lib/spotify-types";
import type { YouTubeMatchedVideoAsset } from "@/lib/youtube-types";

type SpotifyViewerProps = {
  playlists: SpotifyPlaylistAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
  filterValue: string;
};

type SpotifyPlaylistTracksPayload = {
  tracks?: SpotifyPlaylistTrackAsset[];
  error?: string;
};

type YouTubeMatchPayload = {
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

export function SpotifyViewer({
  playlists,
  configured,
  connected,
  error,
  accountName,
  loginHref,
  callbackPath,
  filterValue,
}: SpotifyViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        : "grid gap-5 xl:grid-cols-2 2xl:grid-cols-3";
  const topPlaylists = [...playlists]
    .sort((left, right) => {
      if (right.trackCount !== left.trackCount) {
        return right.trackCount - left.trackCount;
      }

      return left.name.localeCompare(right.name, "es", {
        sensitivity: "base",
      });
    })
    .slice(0, 10);
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
  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;
  const selectedTrack =
    playlistTracks.find((track) => track.id === selectedTrackId) ??
    playlistTracks[0] ??
    null;

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

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
        handleClosePlaylistViewer();
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
    if (playlistTracks.length === 0) {
      setSelectedTrackId("");
      return;
    }

    setSelectedTrackId((currentTrackId) => {
      if (
        currentTrackId &&
        playlistTracks.some((track) => track.id === currentTrackId)
      ) {
        return currentTrackId;
      }

      return playlistTracks[0]?.id ?? "";
    });
  }, [playlistTracks]);

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

  function handleTopPlaylistClick(name: string) {
    setFilterInput(name);
  }

  function handleOpenPlaylistViewer(playlistId: string) {
    setSelectedPlaylistId(playlistId);
  }

  function handleClosePlaylistViewer() {
    setSelectedPlaylistId(null);
    setPlaylistTracks([]);
    setSelectedTrackId("");
    setTrackStatus("idle");
    setTrackError(null);
    setSelectedVideo(null);
    setVideoStatus("idle");
    setVideoError(null);
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

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                    Top 10
                  </p>
                  <p className="text-sm leading-7 text-slate-300">
                    Las playlists con más canciones. Pulsa una para filtrar por
                    su nombre.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {topPlaylists.map((playlist, index) => {
                    const isActive =
                      filterInput.trim().toLocaleLowerCase("es-ES") ===
                      playlist.name.trim().toLocaleLowerCase("es-ES");

                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => handleTopPlaylistClick(playlist.name)}
                        className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-cyan-300/55 bg-cyan-300/12"
                            : "border-white/10 bg-black/20 hover:border-cyan-300/35 hover:bg-cyan-300/8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/80">
                            #{index + 1}
                          </span>
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                            {playlist.trackCount} temas
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold leading-tight text-white">
                          {playlist.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
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
                        anchorId={anchorId}
                        sectionId="spotify"
                        queryKeys={["spotifyFilter"]}
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
              className="fixed inset-0 z-[100] bg-slate-950/92 backdrop-blur-sm"
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

              <div className="relative z-10 h-full overflow-y-auto px-4 py-6">
                <div className="mx-auto flex min-h-full w-full max-w-7xl items-start justify-center">
                  <div className="flex w-full flex-col gap-4">
                    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
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

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                              Canciones
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              Selecciona una y dejaré preparado el hueco del
                              vídeo.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                            {getTrackCountLabel(playlistTracks.length || selectedPlaylist.trackCount)}
                          </span>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-3">
                          {trackStatus === "loading" ? (
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                              Cargando canciones de Spotify...
                            </div>
                          ) : trackStatus === "error" ? (
                            <div className="rounded-[1.35rem] border border-rose-400/25 bg-rose-400/10 px-4 py-6 text-sm leading-7 text-rose-100">
                              {trackError || "No he podido leer las canciones de esta playlist."}
                            </div>
                          ) : playlistTracks.length === 0 ? (
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                              Esta playlist no devuelve canciones utilizables
                              desde la API de Spotify.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {playlistTracks.map((track) => {
                                const isSelected = selectedTrack?.id === track.id;

                                return (
                                  <button
                                    key={track.id}
                                    type="button"
                                    onClick={() => setSelectedTrackId(track.id)}
                                    className={`flex w-full items-start justify-between gap-3 rounded-[1.35rem] border px-4 py-4 text-left transition ${
                                      isSelected
                                        ? "border-cyan-300/55 bg-cyan-300/12"
                                        : "border-white/10 bg-white/6 hover:border-cyan-300/35 hover:bg-cyan-300/8"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                        Pista {track.position}
                                      </p>
                                      <p className="mt-2 truncate text-base font-semibold text-white">
                                        {track.name}
                                      </p>
                                      <p className="mt-1 truncate text-sm text-slate-300">
                                        {track.artistsLabel}
                                      </p>
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

                      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                        <div className="border-b border-white/10 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                            Visor
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {selectedTrack
                              ? `${selectedTrack.name} · ${selectedTrack.artistsLabel}`
                              : "Selecciona una canción para preparar el visor del vídeo."}
                          </p>
                        </div>

                        <div className="flex min-h-[28rem] flex-col gap-6 p-6">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                Canción
                              </p>
                              <p className="mt-3 text-base font-semibold text-white">
                                {selectedTrack?.name || "Sin seleccionar"}
                              </p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                Artista
                              </p>
                              <p className="mt-3 text-base font-semibold text-white">
                                {selectedTrack?.artistsLabel || "Pendiente"}
                              </p>
                            </div>
                            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                Estado
                              </p>
                              <p className="mt-3 text-base font-semibold text-white">
                                {videoStatus === "loading"
                                  ? "Buscando"
                                  : videoStatus === "error"
                                    ? "Error"
                                    : selectedVideo
                                      ? "Vídeo cargado"
                                      : "Sin vídeo"}
                              </p>
                            </div>
                          </div>

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
                            <div className="space-y-4">
                              <div className="flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-lg font-semibold text-white">
                                    {selectedVideo.title}
                                  </p>
                                  <p className="mt-2 truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                                    {selectedVideo.channelTitle} · {selectedVideo.viewCountLabel} visualizaciones
                                  </p>
                                </div>

                                <a
                                  href={selectedVideo.externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-red-300/45 hover:text-white"
                                >
                                  Abrir en YouTube
                                </a>
                              </div>

                              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                                <div className="aspect-video">
                                  <iframe
                                    key={selectedVideo.embedUrl}
                                    src={selectedVideo.embedUrl}
                                    title={selectedVideo.title}
                                    className="h-full w-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  />
                                </div>
                              </div>

                              {selectedVideo.description ? (
                                <p className="text-sm leading-7 text-slate-300">
                                  {selectedVideo.description}
                                </p>
                              ) : null}
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

"use client";

import { useEffect, useState } from "react";

import { ShareCardButton } from "@/components/share-card-button";
import { YouTubeEmbeddedPlayer } from "@/components/youtube-embedded-player";
import { formatYouTubeDurationTotalLabel } from "@/lib/youtube-duration";
import type { RankedYouTubeVideoAsset } from "@/lib/youtube-types";

type MtvViewerProps = {
  videos: RankedYouTubeVideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

type ShufflePlaybackState = {
  history: string[];
  index: number;
};

const TRACK_RATING_VALUES = [1, 2, 3, 4, 5] as const;

function getMtvVideoCountLabel(count: number) {
  return `${count} vídeo${count === 1 ? "" : "s"}`;
}

function buildMtvSearchHaystack(video: RankedYouTubeVideoAsset) {
  return [
    video.trackName,
    video.artistsLabel,
    video.albumName,
    video.albumReleaseYear,
    video.video.title,
    video.video.channelTitle,
    video.matchedQuery,
  ]
    .filter(Boolean)
    .join(" \n")
    .toLocaleLowerCase("es-ES");
}

function ShuffleIcon() {
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
      <path d="M16 4h4v4" />
      <path d="m4 18 6.5-6.5" />
      <path d="M20 4 13 11" />
      <path d="M16 20h4v-4" />
      <path d="m4 6 6.5 6.5" />
      <path d="M20 20 13 13" />
    </svg>
  );
}

function RatingStarIcon({
  active,
  className = "h-3.5 w-3.5",
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3.6 2.55 5.18 5.72.83-4.14 4.04.98 5.7L12 16.67 6.89 19.35l.98-5.7L3.73 9.61l5.72-.83L12 3.6Z" />
    </svg>
  );
}

function MtvLogoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="3.5" y="5" width="17" height="12.5" rx="2.8" />
      <path d="M8 20h8" />
      <path d="M10.2 5 8.4 2.9" />
      <path d="M13.8 5 15.6 2.9" />
      <path d="m8.1 13.4 1.75-4.7 1.8 4.7 1.85-4.7 1.75 4.7" />
    </svg>
  );
}

function MtvRatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1 text-amber-200"
      aria-label={`${rating} estrella${rating === 1 ? "" : "s"}`}
    >
      {TRACK_RATING_VALUES.map((value) => (
        <RatingStarIcon key={value} active={rating >= value} />
      ))}
    </div>
  );
}

export function MtvViewer({
  videos,
  configured,
  error,
  totalCount,
}: MtvViewerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedTrackName, setSelectedTrackName] = useState("");
  const [selectedCacheKey, setSelectedCacheKey] = useState("");
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [shufflePlayback, setShufflePlayback] = useState<ShufflePlaybackState>({
    history: [],
    index: -1,
  });
  const artistOptions = [...new Set(videos.map((video) => video.artistsLabel))].sort(
    (left, right) =>
      left.localeCompare(right, "es", {
        sensitivity: "base",
      }),
  );
  const trackOptions = [
    ...new Set(
      videos
        .filter(
          (video) =>
            !selectedArtist || video.artistsLabel === selectedArtist,
        )
        .map((video) => video.trackName),
    ),
  ].sort((left, right) =>
    left.localeCompare(right, "es", {
      sensitivity: "base",
    }),
  );
  const normalizedSearchValue = searchInput.trim().toLocaleLowerCase("es-ES");
  const filteredVideos = videos.filter((video) => {
    if (selectedArtist && video.artistsLabel !== selectedArtist) {
      return false;
    }

    if (selectedTrackName && video.trackName !== selectedTrackName) {
      return false;
    }

    if (!normalizedSearchValue) {
      return true;
    }

    return buildMtvSearchHaystack(video).includes(normalizedSearchValue);
  });
  const filteredVideoTotalDurationSeconds = filteredVideos.reduce(
    (totalDuration, video) =>
      totalDuration + Math.max(video.video.durationSeconds ?? 0, 0),
    0,
  );
  const filteredVideoTotalDurationLabel = formatYouTubeDurationTotalLabel(
    filteredVideoTotalDurationSeconds,
  );
  const selectedVideo =
    filteredVideos.find((video) => video.cacheKey === selectedCacheKey) ??
    filteredVideos[0] ??
    null;
  const selectedVideoIndex = selectedVideo
    ? filteredVideos.findIndex(
        (video) => video.cacheKey === selectedVideo.cacheKey,
      )
    : -1;
  const hasPreviousVideo = isShuffleEnabled
    ? shufflePlayback.index > 0
    : selectedVideoIndex > 0;
  const hasNextVideo = isShuffleEnabled
    ? filteredVideos.length > 1
    : selectedVideoIndex >= 0 && selectedVideoIndex < filteredVideos.length - 1;

  useEffect(() => {
    if (!selectedTrackName || trackOptions.includes(selectedTrackName)) {
      return;
    }

    setSelectedTrackName("");
  }, [selectedTrackName, trackOptions]);

  useEffect(() => {
    if (!isShuffleEnabled) {
      return;
    }

    const visibleCacheKeySet = new Set(
      filteredVideos.map((video) => video.cacheKey),
    );

    setShufflePlayback((currentPlayback) => {
      const nextHistory = currentPlayback.history.filter((cacheKey) =>
        visibleCacheKeySet.has(cacheKey),
      );

      if (nextHistory.length === 0) {
        const fallbackCacheKey =
          selectedCacheKey && visibleCacheKeySet.has(selectedCacheKey)
            ? selectedCacheKey
            : filteredVideos[0]?.cacheKey ?? "";

        return fallbackCacheKey
          ? { history: [fallbackCacheKey], index: 0 }
          : { history: [], index: -1 };
      }

      const nextIndex = Math.min(currentPlayback.index, nextHistory.length - 1);
      const nextSelectedCacheKey =
        selectedCacheKey && visibleCacheKeySet.has(selectedCacheKey)
          ? selectedCacheKey
          : nextHistory[Math.max(nextIndex, 0)] ?? "";
      const selectedHistoryIndex = nextHistory.indexOf(nextSelectedCacheKey);

      if (
        nextHistory.length === currentPlayback.history.length &&
        nextHistory.every(
          (cacheKey, index) => cacheKey === currentPlayback.history[index],
        ) &&
        selectedHistoryIndex === currentPlayback.index
      ) {
        return currentPlayback;
      }

      if (selectedHistoryIndex >= 0) {
        return {
          history: nextHistory,
          index: selectedHistoryIndex,
        };
      }

      return {
        history: [nextSelectedCacheKey],
        index: nextSelectedCacheKey ? 0 : -1,
      };
    });
  }, [filteredVideos, isShuffleEnabled, selectedCacheKey]);

  useEffect(() => {
    if (filteredVideos.length === 0) {
      setSelectedCacheKey("");
      setShufflePlayback((currentPlayback) =>
        currentPlayback.history.length === 0 && currentPlayback.index === -1
          ? currentPlayback
          : { history: [], index: -1 },
      );
      return;
    }

    if (
      selectedCacheKey &&
      filteredVideos.some((video) => video.cacheKey === selectedCacheKey)
    ) {
      return;
    }

    const fallbackCacheKey = filteredVideos[0]?.cacheKey ?? "";
    setSelectedCacheKey(fallbackCacheKey);

    if (isShuffleEnabled) {
      setShufflePlayback(fallbackCacheKey ? { history: [fallbackCacheKey], index: 0 } : { history: [], index: -1 });
    }
  }, [filteredVideos, isShuffleEnabled, selectedCacheKey]);

  function handleResetFilters() {
    setSearchInput("");
    setSelectedArtist("");
    setSelectedTrackName("");
    setIsShuffleEnabled(false);
    setShufflePlayback({ history: [], index: -1 });
  }

  function handleToggleShuffle() {
    setIsShuffleEnabled((currentValue) => {
      const nextValue = !currentValue;
      const baseCacheKey = selectedVideo?.cacheKey ?? filteredVideos[0]?.cacheKey ?? "";

      if (nextValue) {
        setShufflePlayback(
          baseCacheKey ? { history: [baseCacheKey], index: 0 } : { history: [], index: -1 },
        );
      } else {
        setShufflePlayback({ history: [], index: -1 });
      }

      return nextValue;
    });
  }

  function handleSelectVideo(cacheKey: string) {
    setSelectedCacheKey(cacheKey);

    if (!isShuffleEnabled) {
      return;
    }

    setShufflePlayback({ history: [cacheKey], index: 0 });
  }

  function handleStepVideo(direction: "previous" | "next") {
    if (!selectedVideo || filteredVideos.length === 0) {
      return;
    }

    if (isShuffleEnabled) {
      if (direction === "previous") {
        if (shufflePlayback.index <= 0) {
          return;
        }

        const nextIndex = shufflePlayback.index - 1;
        const nextCacheKey = shufflePlayback.history[nextIndex] ?? "";

        if (!nextCacheKey) {
          return;
        }

        setShufflePlayback((currentPlayback) => ({
          history: currentPlayback.history,
          index: nextIndex,
        }));
        setSelectedCacheKey(nextCacheKey);
        return;
      }

      if (shufflePlayback.index < shufflePlayback.history.length - 1) {
        const nextIndex = shufflePlayback.index + 1;
        const nextCacheKey = shufflePlayback.history[nextIndex] ?? "";

        if (!nextCacheKey) {
          return;
        }

        setShufflePlayback((currentPlayback) => ({
          history: currentPlayback.history,
          index: nextIndex,
        }));
        setSelectedCacheKey(nextCacheKey);
        return;
      }

      const visibleCacheKeys = filteredVideos.map((video) => video.cacheKey);
      const currentHistory = shufflePlayback.history.slice(
        0,
        shufflePlayback.index + 1,
      );
      const unseenCacheKeys = visibleCacheKeys.filter(
        (cacheKey) =>
          cacheKey !== selectedVideo.cacheKey &&
          !currentHistory.includes(cacheKey),
      );
      const fallbackCacheKeys = visibleCacheKeys.filter(
        (cacheKey) => cacheKey !== selectedVideo.cacheKey,
      );
      const candidateCacheKeys =
        unseenCacheKeys.length > 0 ? unseenCacheKeys : fallbackCacheKeys;

      if (candidateCacheKeys.length === 0) {
        return;
      }

      const nextCacheKey =
        candidateCacheKeys[
          Math.floor(Math.random() * candidateCacheKeys.length)
        ] ?? "";

      if (!nextCacheKey) {
        return;
      }

      setShufflePlayback({
        history: [...currentHistory, nextCacheKey],
        index: currentHistory.length,
      });
      setSelectedCacheKey(nextCacheKey);
      return;
    }

    const currentVideoIndex = filteredVideos.findIndex(
      (video) => video.cacheKey === selectedVideo.cacheKey,
    );

    if (currentVideoIndex < 0) {
      return;
    }

    const nextVideo =
      direction === "next"
        ? filteredVideos[currentVideoIndex + 1]
        : filteredVideos[currentVideoIndex - 1];

    if (!nextVideo) {
      return;
    }

    setSelectedCacheKey(nextVideo.cacheKey);
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-amber-300/85">
              MTV
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                como la MTV pero mejor...
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton anchorId="mtv" className="shrink-0" />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/12 text-amber-100">
                <MtvLogoIcon />
              </span>
              <span>{getMtvVideoCountLabel(totalCount)} con ranking</span>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm leading-7 text-amber-100">
            {error || "Falta configurar Supabase para leer el bloque MTV."}
          </div>
        ) : error && videos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No he encontrado vídeos cacheados que tengan ranking.
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/35 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
                <div className="space-y-4 border-b border-white/10 px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">
                        Selección
                      </p>
                      <p className="mt-2 text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                        {getMtvVideoCountLabel(filteredVideos.length)} en lista
                        {filteredVideoTotalDurationLabel
                          ? ` · ${filteredVideoTotalDurationLabel}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleShuffle}
                        aria-label={
                          isShuffleEnabled
                            ? "Desactivar reproducción aleatoria"
                            : "Activar reproducción aleatoria"
                        }
                        title={
                          isShuffleEnabled
                            ? "Desactivar reproducción aleatoria"
                            : "Activar reproducción aleatoria"
                        }
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                          isShuffleEnabled
                            ? "border-amber-300/55 bg-amber-300/12 text-amber-100"
                            : "border-white/12 bg-white/6 text-slate-200 hover:border-amber-300/35 hover:text-white"
                        }`}
                      >
                        <ShuffleIcon />
                      </button>

                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="rounded-full border border-white/12 px-3 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/35 hover:bg-white/6"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Buscar por artista, tema, canal o vídeo..."
                      className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/70"
                    />

                    <select
                      value={selectedArtist}
                      onChange={(event) => setSelectedArtist(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                    >
                      <option value="">Todos los artistas</option>
                      {artistOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedTrackName}
                      onChange={(event) =>
                        setSelectedTrackName(event.target.value)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                    >
                      <option value="">Todos los temas</option>
                      {trackOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="max-h-[46rem] overflow-y-auto p-3">
                  {filteredVideos.length === 0 ? (
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-6 text-sm leading-7 text-slate-300">
                      No hay vídeos que coincidan con ese filtro.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredVideos.map((video) => {
                        const isSelected =
                          selectedVideo?.cacheKey === video.cacheKey;

                        return (
                          <button
                            key={video.cacheKey}
                            type="button"
                            onClick={() => handleSelectVideo(video.cacheKey)}
                            className={`flex w-full flex-col gap-3 rounded-[1.35rem] border px-3 py-3 text-left transition sm:px-4 sm:py-4 ${
                              isSelected
                                ? "border-amber-300/55 bg-amber-300/12"
                                : "border-white/10 bg-white/6 hover:border-amber-300/35 hover:bg-amber-300/8"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                                  <span className="truncate">
                                    {video.artistsLabel}
                                  </span>
                                </div>
                                <p className="mt-2 truncate text-base font-semibold text-white">
                                  {video.trackName}
                                </p>
                                <p
                                  className="mt-1 truncate text-sm text-amber-100/80"
                                  title={video.video.title}
                                >
                                  {video.albumName
                                    ? `${video.albumName}${video.albumReleaseYear ? ` · ${video.albumReleaseYear}` : ""}`
                                    : video.video.title}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-amber-100">
                                {video.rating}★
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                {selectedVideo ? (
                  <>
                    <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">
                          Visor MTV
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          {selectedVideo.trackName}
                        </h3>
                        <div className="mt-3 flex flex-nowrap items-center gap-2 text-sm text-slate-300">
                          <p className="min-w-0 truncate">
                            {selectedVideo.artistsLabel}
                          </p>
                          {selectedVideo.albumReleaseYear ? (
                            <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-amber-100">
                              {selectedVideo.albumReleaseYear}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <MtvRatingStars rating={selectedVideo.rating} />
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-nowrap items-center gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleStepVideo("previous")}
                          disabled={!hasPreviousVideo}
                          className="whitespace-nowrap rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-amber-300/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepVideo("next")}
                          disabled={!hasNextVideo}
                          className="whitespace-nowrap rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-amber-300/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                        <div className="aspect-video">
                          <YouTubeEmbeddedPlayer
                            videoId={selectedVideo.video.id}
                            title={selectedVideo.video.title}
                            autoplay
                            onEnded={() => handleStepVideo("next")}
                            className="h-full w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[28rem] items-center justify-center p-6">
                    <div className="mx-auto max-w-xl text-center">
                      <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-300/80">
                        Sin selección
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold text-white">
                        No hay vídeos visibles ahora mismo
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        Ajusta el filtro de artista, tema o texto para volver a
                        cargar la parrilla MTV.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

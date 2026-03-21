"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useState } from "react";
import type {
  ConcertAsset,
  ConcertPhotoAsset,
} from "@/lib/supabase/concerts";

type ConcertsViewerProps = {
  concerts: ConcertAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

type SelectedConcertVideo = {
  concertName: string;
  label: string;
  externalUrl: string;
  embedUrl: string;
  platform: "youtube" | "instagram";
};

type SelectedConcertPhotoViewer = {
  concertName: string;
  photos: ConcertPhotoAsset[];
  selectedIndex: number;
};

function buildConcertLocation(concert: ConcertAsset) {
  return [concert.city, concert.venue].filter(Boolean).join(" · ");
}

function buildConcertPhotoMeta(photo: ConcertPhotoAsset) {
  return [photo.dateLabel, photo.origin, photo.place].filter(Boolean).join(" · ");
}

function buildConcertPhotoPeopleLabel(photo: ConcertPhotoAsset) {
  return photo.people.join(", ");
}

function getConcertPhotoCountLabel(count: number) {
  return `${count} foto${count === 1 ? "" : "s"}`;
}

function getYouTubeEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      if (!videoId) {
        return null;
      }

      const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

      for (const key of ["start", "list", "si"]) {
        const value = url.searchParams.get(key);

        if (value) {
          embedUrl.searchParams.set(key, value);
        }
      }

      return embedUrl.toString();
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return url.toString();
      }

      const videoId = url.searchParams.get("v");

      if (!videoId) {
        return null;
      }

      const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

      for (const key of ["start", "list", "si"]) {
        const value = url.searchParams.get(key);

        if (value) {
          embedUrl.searchParams.set(key, value);
        }
      }

      return embedUrl.toString();
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
      } else {
        videoId = url.searchParams.get("v");
      }
    }

    if (!videoId) {
      return rawUrl;
    }

    const externalUrl = new URL("https://www.youtube.com/watch");
    externalUrl.searchParams.set("v", videoId);

    for (const key of ["start", "list", "si"]) {
      const value = url.searchParams.get(key);

      if (value) {
        externalUrl.searchParams.set(key, value);
      }
    }

    return externalUrl.toString();
  } catch {
    return rawUrl;
  }
}

function getInstagramEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname !== "instagram.com" && !hostname.endsWith(".instagram.com")) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const contentType = segments[0];
    const contentId = segments[1];

    if (!contentType || !contentId || !["p", "reel", "tv"].includes(contentType)) {
      return null;
    }

    return `https://www.instagram.com/${contentType}/${contentId}/embed`;
  } catch {
    return null;
  }
}

function getInstagramExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname !== "instagram.com" && !hostname.endsWith(".instagram.com")) {
      return rawUrl;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const contentType = segments[0];
    const contentId = segments[1];

    if (!contentType || !contentId || !["p", "reel", "tv"].includes(contentType)) {
      return rawUrl;
    }

    return `https://www.instagram.com/${contentType}/${contentId}/`;
  } catch {
    return rawUrl;
  }
}

function getConcertVideoDescriptor(
  rawUrl: string,
  concertName: string,
  label: string,
): SelectedConcertVideo | null {
  const youTubeEmbedUrl = getYouTubeEmbedUrl(rawUrl);

  if (youTubeEmbedUrl) {
    return {
      concertName,
      label,
      externalUrl: getYouTubeExternalUrl(rawUrl),
      embedUrl: youTubeEmbedUrl,
      platform: "youtube",
    };
  }

  const instagramEmbedUrl = getInstagramEmbedUrl(rawUrl);

  if (instagramEmbedUrl) {
    return {
      concertName,
      label,
      externalUrl: getInstagramExternalUrl(rawUrl),
      embedUrl: instagramEmbedUrl,
      platform: "instagram",
    };
  }

  return null;
}

export function ConcertsViewer({
  concerts,
  configured,
  error,
  totalCount,
}: ConcertsViewerProps) {
  const [selectedVideo, setSelectedVideo] = useState<SelectedConcertVideo | null>(
    null,
  );
  const [selectedPhotoViewer, setSelectedPhotoViewer] =
    useState<SelectedConcertPhotoViewer | null>(null);

  const selectedConcertPhoto =
    selectedPhotoViewer?.photos.at(selectedPhotoViewer.selectedIndex) ?? null;

  const closeVideoViewer = () => setSelectedVideo(null);
  const closePhotoViewer = () => setSelectedPhotoViewer(null);

  const showPreviousConcertPhoto = () => {
    setSelectedPhotoViewer((current) => {
      if (!current || current.photos.length <= 1) {
        return current;
      }

      return {
        ...current,
        selectedIndex:
          current.selectedIndex === 0
            ? current.photos.length - 1
            : current.selectedIndex - 1,
      };
    });
  };

  const showNextConcertPhoto = () => {
    setSelectedPhotoViewer((current) => {
      if (!current || current.photos.length <= 1) {
        return current;
      }

      return {
        ...current,
        selectedIndex:
          current.selectedIndex === current.photos.length - 1
            ? 0
            : current.selectedIndex + 1,
      };
    });
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (selectedPhotoViewer !== null) {
      if (event.key === "Escape") {
        closePhotoViewer();
      }

      if (event.key === "ArrowLeft") {
        showPreviousConcertPhoto();
      }

      if (event.key === "ArrowRight") {
        showNextConcertPhoto();
      }

      return;
    }

    if (selectedVideo === null) {
      return;
    }

    if (event.key === "Escape") {
      closeVideoViewer();
    }
  });

  useEffect(() => {
    if (selectedVideo === null && selectedPhotoViewer === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPhotoViewer, selectedVideo]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(3,7,18,0.24)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-300/85">
              Conciertos
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Bolos a los que me he escapado...
              </h2>
              <p className="text-sm text-slate-300 md:text-base">
                Fechas, salas, ciudades y unos cuantos vídeos para recordar la
                jugada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{totalCount} conciertos cargados</span>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-3xl border border-amber-300/30 bg-amber-300/8 p-5 text-sm leading-7 text-amber-50">
            Faltan datos de conexión. Necesitas definir
            `NEXT_PUBLIC_SUPABASE_URL` y una clave pública para poder leer los
            conciertos.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
            {error}
          </div>
        ) : null}

        {configured && !error && concerts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
            La tabla `public.conciertos` está accesible, pero todavía no hay
            conciertos cargados.
          </div>
        ) : null}

        {concerts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {concerts.map((concert) => {
              const location = buildConcertLocation(concert);
              const concertName = concert.groupName ?? "Grupo sin vincular";

              return (
                <article
                  key={concert.id}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 shadow-[0_18px_50px_rgba(17,24,39,0.28)]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/80">
                          {concert.dateLabel}
                        </p>
                        <h3 className="text-xl font-semibold text-white">
                          {concertName}
                        </h3>
                        {location ? (
                          <p className="text-sm text-slate-300">{location}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {concert.festival ? (
                          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                            Festival
                          </span>
                        ) : null}
                        {concert.photoCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideo(null);
                              setSelectedPhotoViewer({
                                concertName,
                                photos: concert.photos,
                                selectedIndex: 0,
                              });
                            }}
                            className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/18"
                          >
                            {getConcertPhotoCountLabel(concert.photoCount)}
                          </button>
                        ) : concert.hasPhotos ? (
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/6 px-3 py-1 text-xs font-medium text-cyan-100/70">
                            Fotos sin vincular
                          </span>
                        ) : null}
                        {concert.videos.length > 0 ? (
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                            {concert.videos.length} vídeos
                          </span>
                        ) : null}
                        {concert.instagramVideos.length > 0 ? (
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                            {concert.instagramVideos.length} reels
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {concert.description ? (
                      <p className="line-clamp-3 text-sm leading-7 text-slate-300">
                        {concert.description}
                      </p>
                    ) : concert.review ? (
                      <p className="line-clamp-3 text-sm leading-7 text-slate-300">
                        {concert.review}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {concert.videos.slice(0, 3).map((videoUrl, index) => {
                        const label = `Video ${index + 1}`;
                        const descriptor = getConcertVideoDescriptor(
                          videoUrl,
                          concertName,
                          label,
                        );

                        if (descriptor) {
                          return (
                            <button
                              type="button"
                              key={videoUrl}
                              onClick={() => {
                                setSelectedPhotoViewer(null);
                                setSelectedVideo(descriptor);
                              }}
                              className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                            >
                              {label}
                            </button>
                          );
                        }

                        return (
                          <a
                            key={videoUrl}
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                          >
                            {label}
                          </a>
                        );
                      })}

                      {concert.instagramVideos
                        .slice(0, 2)
                        .map((videoUrl, index) => {
                          const label = `Instagram ${index + 1}`;
                          const descriptor = getConcertVideoDescriptor(
                            videoUrl,
                            concertName,
                            label,
                          );

                          if (descriptor) {
                            return (
                              <button
                                type="button"
                                key={videoUrl}
                                onClick={() => {
                                  setSelectedPhotoViewer(null);
                                  setSelectedVideo(descriptor);
                                }}
                                className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                              >
                                {label}
                              </button>
                            );
                          }

                          return (
                            <a
                              key={videoUrl}
                              href={videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                            >
                              {label}
                            </a>
                          );
                        })}
                    </div>

                    {concert.ticketImageSrc || concert.posterImageSrc ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {concert.ticketImageSrc ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Entrada
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                              <Image
                                src={concert.ticketImageSrc}
                                alt={`${concert.groupName ?? "Concierto"} entrada`}
                                width={1200}
                                height={700}
                                unoptimized
                                className="h-auto w-full object-contain"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                            </div>
                          </div>
                        ) : null}

                        {concert.posterImageSrc ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Cartel
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                              <Image
                                src={concert.posterImageSrc}
                                alt={`${concert.groupName ?? "Concierto"} cartel`}
                                width={1200}
                                height={700}
                                unoptimized
                                className="h-auto w-full object-contain"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : concert.ticket || concert.poster ? (
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {[concert.ticket, concert.poster].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      {selectedVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar visor de video"
            className="absolute inset-0 cursor-default"
            onClick={closeVideoViewer}
          />

          <div className="relative z-10 flex w-full max-w-6xl flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {selectedVideo.concertName}
                </p>
                <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                  {selectedVideo.label} ·{" "}
                  {selectedVideo.platform === "youtube" ? "YouTube" : "Instagram"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={selectedVideo.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                >
                  Abrir fuera
                </a>
                <button
                  type="button"
                  onClick={closeVideoViewer}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div
                className={
                  selectedVideo.platform === "instagram"
                    ? "mx-auto aspect-[9/16] min-h-[70vh] w-full max-w-[420px]"
                    : "aspect-video min-h-[60vh] w-full"
                }
              >
                <iframe
                  key={selectedVideo.embedUrl}
                  src={selectedVideo.embedUrl}
                  title={`${selectedVideo.concertName} ${selectedVideo.label}`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPhotoViewer && selectedConcertPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar visor de fotos del concierto"
            className="absolute inset-0 cursor-default"
            onClick={closePhotoViewer}
          />

          <div className="relative z-10 flex w-full max-w-6xl flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-slate-200">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {selectedPhotoViewer.concertName}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {selectedConcertPhoto.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {selectedConcertPhoto.name}
                </p>
                {buildConcertPhotoMeta(selectedConcertPhoto) ? (
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {buildConcertPhotoMeta(selectedConcertPhoto)}
                  </p>
                ) : null}
                {selectedConcertPhoto.groupName ? (
                  <p className="truncate text-xs text-cyan-200/90">
                    {selectedConcertPhoto.groupName}
                  </p>
                ) : null}
                {selectedConcertPhoto.people.length > 0 ? (
                  <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-300">
                    {buildConcertPhotoPeopleLabel(selectedConcertPhoto)}
                  </p>
                ) : null}
                {selectedConcertPhoto.description ? (
                  <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-300">
                    {selectedConcertPhoto.description}
                  </p>
                ) : null}
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {selectedPhotoViewer.selectedIndex + 1} /{" "}
                  {selectedPhotoViewer.photos.length}
                </p>
              </div>

              <button
                type="button"
                onClick={closePhotoViewer}
                className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
              >
                Cerrar
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="relative aspect-[16/11] min-h-[55vh]">
                <Image
                  src={selectedConcertPhoto.src}
                  alt={selectedConcertPhoto.name}
                  fill
                  priority
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                />
              </div>

              {selectedPhotoViewer.photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior del concierto"
                    onClick={showPreviousConcertPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/60 hover:bg-slate-900/90"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    aria-label="Foto siguiente del concierto"
                    onClick={showNextConcertPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/60 hover:bg-slate-900/90"
                  >
                    Next
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

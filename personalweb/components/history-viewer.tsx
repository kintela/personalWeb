"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { ShareCardButton } from "@/components/share-card-button";
import { VideoInfoHover } from "@/components/video-info-hover";
import type { VideoAsset } from "@/lib/supabase/videos";

type HistoryViewerProps = {
  videos: VideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

const HISTORY_VIEWER_GRID_STORAGE_KEY = "history-viewer-grid-density";
const HISTORY_CATEGORY_ORDER = ["guerra_civil", "ii_guerra_mundial"] as const;
const HISTORY_SUBCATEGORY_ORDER = ["documental", "película"] as const;

type HistoryGridDensity = "default" | "compact" | "dense";

function formatPlatformLabel(platform: string | null) {
  if (!platform) {
    return null;
  }

  const normalizedPlatform = platform.trim().toLocaleLowerCase("es-ES");

  switch (normalizedPlatform) {
    case "rtve_play":
      return "RTVE Play";
    case "primevideo":
      return "Prime Video";
    case "apple tv":
      return "Apple TV";
    case "filmin":
      return "Filmin";
    case "caixaforum":
      return "CaixaForum";
    case "disney+":
      return "Disney+";
    case "hbo":
      return "HBO";
    case "canalsurmas":
      return "CanalSur Más";
    case "google drive":
      return "Google Drive";
    case "documania tv":
      return "Documania TV";
    case "eitb":
      return "EITB";
    case "atresplayer":
      return "Atresplayer";
    case "youtube":
      return "YouTube";
    case "netflix":
      return "Netflix";
    default:
      return platform.replaceAll("_", " ");
  }
}

function formatHistoryCategoryLabel(category: string) {
  switch (category) {
    case "guerra_civil":
      return "Guerra Civil";
    case "ii_guerra_mundial":
      return "II Guerra Mundial";
    default:
      return category.replaceAll("_", " ");
  }
}

function sortHistoryVideosBySubcategory(videos: VideoAsset[]) {
  return [...videos].sort((left, right) => {
    const leftPriority = HISTORY_SUBCATEGORY_ORDER.indexOf(
      left.subcategory?.toLocaleLowerCase("es-ES") as
        | (typeof HISTORY_SUBCATEGORY_ORDER)[number]
        | undefined,
    );
    const rightPriority = HISTORY_SUBCATEGORY_ORDER.indexOf(
      right.subcategory?.toLocaleLowerCase("es-ES") as
        | (typeof HISTORY_SUBCATEGORY_ORDER)[number]
        | undefined,
    );
    const normalizedLeftPriority =
      leftPriority === -1 ? HISTORY_SUBCATEGORY_ORDER.length : leftPriority;
    const normalizedRightPriority =
      rightPriority === -1 ? HISTORY_SUBCATEGORY_ORDER.length : rightPriority;

    return normalizedLeftPriority - normalizedRightPriority;
  });
}

function GridDensityIcon({
  active,
  columns,
}: {
  active: boolean;
  columns: 4 | 6;
}) {
  const squareClassName = active
    ? "border-cyan-300/60 bg-cyan-300/20"
    : "border-white/20 bg-white/8";
  const cells = columns === 6 ? 6 : 4;
  const gridClassName = columns === 6 ? "grid-cols-3" : "grid-cols-2";

  return (
    <span className={`grid ${gridClassName} gap-1`}>
      {Array.from({ length: cells }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-[0.2rem] border ${squareClassName}`}
        />
      ))}
    </span>
  );
}

function buildGroupedHistoryVideos(videos: VideoAsset[]) {
  const sections = HISTORY_CATEGORY_ORDER.map((category) => ({
    category,
    label: formatHistoryCategoryLabel(category),
    videos: sortHistoryVideosBySubcategory(
      videos.filter((video) => video.category === category),
    ),
  })).filter((section) => section.videos.length > 0);

  const knownCategories = new Set(HISTORY_CATEGORY_ORDER);
  const extraCategories = [...new Set(videos.map((video) => video.category).filter(Boolean))]
    .filter((category): category is string => !knownCategories.has(category as (typeof HISTORY_CATEGORY_ORDER)[number]))
    .map((category) => ({
      category,
      label: formatHistoryCategoryLabel(category),
      videos: sortHistoryVideosBySubcategory(
        videos.filter((video) => video.category === category),
      ),
    }));

  return [...sections, ...extraCategories];
}

export function HistoryViewer({
  videos,
  configured,
  error,
  totalCount,
}: HistoryViewerProps) {
  const [gridDensity, setGridDensity] = useState<HistoryGridDensity>("default");

  useEffect(() => {
    const savedValue = window.localStorage.getItem(
      HISTORY_VIEWER_GRID_STORAGE_KEY,
    ) as HistoryGridDensity | null;
    const nextGridDensity: HistoryGridDensity =
      savedValue === "compact" ||
      savedValue === "dense" ||
      savedValue === "default"
        ? savedValue
        : "default";

    if (nextGridDensity === "default") {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setGridDensity(nextGridDensity);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_VIEWER_GRID_STORAGE_KEY, gridDensity);
  }, [gridDensity]);

  const groupedVideos = buildGroupedHistoryVideos(videos);
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Historia
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Memoria, guerra y archivo...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Documentales para volver sobre la Guerra Civil, la Segunda
                Guerra Mundial y otras historias que conviene no dejar atrás.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton anchorId="historia" className="shrink-0" />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>{totalCount} vídeos históricos</span>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar la
            sección de historia.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay vídeos históricos cargados todavía.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                Los documentales están agrupados por periodo histórico.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={
                    gridDensity === "compact"
                      ? "Volver al tamaño normal"
                      : "Ver más tarjetas por fila"
                  }
                  aria-pressed={gridDensity === "compact"}
                  onClick={() =>
                    setGridDensity((current) =>
                      current === "compact" ? "default" : "compact",
                    )
                  }
                  className={`inline-flex items-center justify-center rounded-2xl border px-3 py-3 text-sm transition ${
                    gridDensity === "compact"
                      ? "border-cyan-300/55 bg-cyan-300/12 text-cyan-100"
                      : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
                  }`}
                >
                  <span className="sr-only">
                    {gridDensity === "compact"
                      ? "Volver al tamaño normal"
                      : "Activar vista compacta"}
                  </span>
                  <GridDensityIcon
                    active={gridDensity === "compact"}
                    columns={4}
                  />
                </button>

                <button
                  type="button"
                  title={
                    gridDensity === "dense"
                      ? "Volver al tamaño normal"
                      : "Ver la rejilla más densa"
                  }
                  aria-pressed={gridDensity === "dense"}
                  onClick={() =>
                    setGridDensity((current) =>
                      current === "dense" ? "default" : "dense",
                    )
                  }
                  className={`inline-flex items-center justify-center rounded-2xl border px-3 py-3 text-sm transition ${
                    gridDensity === "dense"
                      ? "border-cyan-300/55 bg-cyan-300/12 text-cyan-100"
                      : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
                  }`}
                >
                  <span className="sr-only">
                    {gridDensity === "dense"
                      ? "Volver al tamaño normal"
                      : "Activar vista densa"}
                  </span>
                  <GridDensityIcon active={gridDensity === "dense"} columns={6} />
                </button>
              </div>
            </div>

            <div className="space-y-10">
              {groupedVideos.map((section) => (
                <div key={section.category} className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/75">
                        Bloque
                      </p>
                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        {section.label}
                      </h3>
                    </div>

                    <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm text-slate-300">
                      {section.videos.length} vídeos
                    </span>
                  </div>

                  <div className={gridClassName}>
                    {section.videos.map((video) => {
                      const platformLabel = formatPlatformLabel(video.platform);
                      const anchorId = `historia-video-${video.id}`;

                      return (
                        <article
                          key={video.id}
                          id={anchorId}
                          className="relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                        >
                          <ShareCardButton
                            anchorId={anchorId}
                            sectionId="historia"
                            className="absolute right-4 top-4 z-10"
                          />

                          <a
                            href={video.link}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <div className="group relative aspect-[4/3] overflow-hidden bg-slate-900">
                              {video.imageSrc ? (
                                <Image
                                  src={video.imageSrc}
                                  alt={`Carátula de ${video.title}`}
                                  fill
                                  unoptimized
                                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-8 text-center text-sm uppercase tracking-[0.3em] text-slate-400">
                                  Sin carátula
                                </div>
                              )}
                              <VideoInfoHover info={video.info} />
                            </div>
                          </a>

                          <div className="flex flex-1 flex-col gap-4 p-5">
                            <div className="flex flex-wrap gap-2">
                              {platformLabel ? (
                                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                                  {platformLabel}
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold leading-tight text-white">
                                {video.title}
                              </h3>
                            </div>

                            <div className="mt-auto flex flex-wrap gap-3 pt-1">
                              <a
                                href={video.link}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                              >
                                Ver vídeo
                              </a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

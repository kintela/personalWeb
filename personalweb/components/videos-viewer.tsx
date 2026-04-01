"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import { VideoInfoHover } from "@/components/video-info-hover";
import type { VideoAsset } from "@/lib/supabase/videos";

type VideosViewerProps = {
  videos: VideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  categoryValue: string;
  platformValue: string;
  availabilityValue: string;
  categoryOptions: string[];
  platformOptions: string[];
  initiallyAdminUnlocked: boolean;
};

const VIDEOS_VIEWER_GRID_STORAGE_KEY = "videos-viewer-grid-density";

function AvailableIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

function UnavailableIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}

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

export function VideosViewer({
  videos,
  configured,
  error,
  totalCount,
  filterValue,
  categoryValue,
  platformValue,
  availabilityValue,
  categoryOptions,
  platformOptions,
  initiallyAdminUnlocked,
}: VideosViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(filterValue);
  const [selectedCategory, setSelectedCategory] = useState(categoryValue);
  const [selectedPlatform, setSelectedPlatform] = useState(platformValue);
  const [selectedAvailability, setSelectedAvailability] =
    useState(availabilityValue);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(initiallyAdminUnlocked);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);
  const [videoAvailability, setVideoAvailability] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(videos.map((video) => [video.id, video.available])),
  );
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    VIDEOS_VIEWER_GRID_STORAGE_KEY,
  );
  const hasActiveFilters = Boolean(
    filterValue || categoryValue || platformValue || availabilityValue,
  );
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setSelectedCategory(categoryValue);
  }, [categoryValue]);

  useEffect(() => {
    setSelectedPlatform(platformValue);
  }, [platformValue]);

  useEffect(() => {
    setSelectedAvailability(availabilityValue);
  }, [availabilityValue]);

  useEffect(() => {
    setIsAdminUnlocked(initiallyAdminUnlocked);
  }, [initiallyAdminUnlocked]);

  useEffect(() => {
    setVideoAvailability(
      Object.fromEntries(videos.map((video) => [video.id, video.available])),
    );
  }, [videos]);

  async function ensureAdminUnlocked() {
    if (isAdminUnlocked) {
      return true;
    }

    const password = window.prompt("Contraseña admin");

    if (!password?.trim()) {
      return false;
    }

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        window.alert(payload.error ?? "No he podido validar la contraseña.");
        return false;
      }

      setIsAdminUnlocked(true);
      return true;
    } catch {
      window.alert("No he podido validar la contraseña.");
      return false;
    }
  }

  async function handleAvailabilityToggle(videoId: string, nextAvailable: boolean) {
    const adminReady = await ensureAdminUnlocked();

    if (!adminReady) {
      return;
    }

    const previousAvailable = videoAvailability[videoId] ?? true;

    setSavingVideoId(videoId);
    setVideoAvailability((current) => ({
      ...current,
      [videoId]: nextAvailable,
    }));

    try {
      const response = await fetch("/api/videos/availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: videoId,
          available: nextAvailable,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        available?: boolean;
      };

      if (!response.ok || !payload.ok || typeof payload.available !== "boolean") {
        setVideoAvailability((current) => ({
          ...current,
          [videoId]: previousAvailable,
        }));
        window.alert(
          payload.error ?? "No he podido guardar la disponibilidad del vídeo.",
        );
        return;
      }

      setVideoAvailability((current) => ({
        ...current,
        [videoId]: payload.available as boolean,
      }));
      router.refresh();
    } catch {
      setVideoAvailability((current) => ({
        ...current,
        [videoId]: previousAvailable,
      }));
      window.alert("No he podido guardar la disponibilidad del vídeo.");
    } finally {
      setSavingVideoId(null);
    }
  }

  function applyFilters({
    nextFilterValue,
    nextCategoryValue,
    nextPlatformValue,
    nextAvailabilityValue,
  }: {
    nextFilterValue: string;
    nextCategoryValue: string;
    nextPlatformValue: string;
    nextAvailabilityValue: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedFilterValue = nextFilterValue.trim();
    const normalizedCategoryValue = nextCategoryValue.trim();
    const normalizedPlatformValue = nextPlatformValue.trim();
    const normalizedAvailabilityValue = nextAvailabilityValue.trim();

    if (normalizedFilterValue) {
      params.set("videoFilter", normalizedFilterValue);
    } else {
      params.delete("videoFilter");
    }

    if (normalizedCategoryValue) {
      params.set("videoCategory", normalizedCategoryValue);
    } else {
      params.delete("videoCategory");
    }

    if (normalizedPlatformValue) {
      params.set("videoPlatform", normalizedPlatformValue);
    } else {
      params.delete("videoPlatform");
    }

    if (normalizedAvailabilityValue) {
      params.set("videoAvailability", normalizedAvailabilityValue);
    } else {
      params.delete("videoAvailability");
    }

    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  }

  function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({
      nextFilterValue: filterInput,
      nextCategoryValue: selectedCategory,
      nextPlatformValue: selectedPlatform,
      nextAvailabilityValue: selectedAvailability,
    });
  }

  function handleReset() {
    setFilterInput("");
    setSelectedCategory("");
    setSelectedPlatform("");
    setSelectedAvailability("");
    applyFilters({
      nextFilterValue: "",
      nextCategoryValue: "",
      nextPlatformValue: "",
      nextAvailabilityValue: "",
    });
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Videos
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Películas y documentales musicales...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Un rincón para perderse entre conciertos, biografías filmadas y
                otras obsesiones musicales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton
              anchorId="videos"
              queryKeys={[
                "videoFilter",
                "videoCategory",
                "videoPlatform",
                "videoAvailability",
              ]}
              className="shrink-0"
            />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>{totalCount} vídeos cargados</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
          <form className="space-y-5" onSubmit={handleApply}>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                Filtro
              </p>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_240px_220px_220px_auto_auto] xl:items-center">
                <input
                  type="search"
                  value={filterInput}
                  onChange={(event) => setFilterInput(event.target.value)}
                  placeholder="Ejemplo: Bowie, Netflix, punk, Amy..."
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                />

                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todas las categorías</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedPlatform}
                  onChange={(event) => setSelectedPlatform(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todas las plataformas</option>
                  {platformOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatPlatformLabel(option)}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAvailability}
                  onChange={(event) =>
                    setSelectedAvailability(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todos los estados</option>
                  <option value="available">Solo disponibles</option>
                  <option value="unavailable">Solo no disponibles</option>
                </select>

                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Aplicar
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-white/12 bg-black/20 px-6 py-4 text-base text-slate-100 transition hover:border-white/25 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {hasActiveFilters ? (
              <p className="text-sm text-slate-300">
                {totalCount} vídeos encontrados
                {filterValue ? (
                  <>
                    {" "}
                    para <span className="font-semibold text-white">{filterValue}</span>
                  </>
                ) : null}
                {categoryValue ? (
                  <>
                    {" "}
                    en{" "}
                    <span className="font-semibold text-white">{categoryValue}</span>
                  </>
                ) : null}
                {platformValue ? (
                  <>
                    {" "}
                    de{" "}
                    <span className="font-semibold text-white">
                      {formatPlatformLabel(platformValue)}
                    </span>
                  </>
                ) : null}
                {availabilityValue === "available" ? (
                  <>
                    {" "}
                    con estado{" "}
                    <span className="font-semibold text-white">disponible</span>
                  </>
                ) : null}
                {availabilityValue === "unavailable" ? (
                  <>
                    {" "}
                    con estado{" "}
                    <span className="font-semibold text-white">
                      no disponible
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar los
            vídeos.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay vídeos cargados todavía.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <GridDensityControls
                gridDensity={gridDensity}
                setGridDensity={setGridDensity}
                compactTitle="Activar vista compacta de vídeos"
                denseTitle="Activar vista densa de vídeos"
              />
            </div>

            <div className={gridClassName}>
              {videos.map((video) => {
                const isAvailable = videoAvailability[video.id] ?? video.available;
                const isSavingAvailability = savingVideoId === video.id;
                const platformLabel = formatPlatformLabel(video.platform);
                const anchorId = `video-${video.id}`;
                const articleClassName = isAvailable
                  ? "relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                  : "relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/8 bg-slate-950/35 opacity-75 shadow-[0_18px_50px_rgba(15,23,42,0.18)]";
                const mediaClassName = isAvailable
                  ? "object-cover transition duration-500 group-hover:scale-[1.03]"
                  : "object-cover grayscale brightness-[0.6] transition duration-500";
                const titleClassName = isAvailable
                  ? "text-xl font-semibold leading-tight text-white"
                  : "text-xl font-semibold leading-tight text-slate-300";

                return (
                  <article
                    key={video.id}
                    id={anchorId}
                    className={articleClassName}
                  >
                    <ShareCardButton
                      anchorId={anchorId}
                      sectionId="videos"
                      queryKeys={[
                        "videoFilter",
                        "videoCategory",
                        "videoPlatform",
                        "videoAvailability",
                      ]}
                      className="absolute right-4 top-4 z-10"
                    />

                    {isAvailable ? (
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
                              className={mediaClassName}
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
                    ) : (
                      <div className="group relative aspect-[4/3] overflow-hidden bg-slate-900">
                        {video.imageSrc ? (
                          <Image
                            src={video.imageSrc}
                            alt={`Carátula de ${video.title}`}
                            fill
                            unoptimized
                            className={mediaClassName}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-8 text-center text-sm uppercase tracking-[0.3em] text-slate-500">
                            Sin carátula
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-slate-950/28" />
                        <div className="absolute left-4 top-4 z-[1] rounded-full border border-rose-300/20 bg-slate-950/78 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-rose-100">
                          No disponible
                        </div>
                        <VideoInfoHover info={video.info} />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        {video.category ? (
                          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cyan-100">
                            {video.category}
                          </span>
                        ) : null}
                        {platformLabel ? (
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                            {platformLabel}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className={titleClassName}>
                          {video.title}
                        </h3>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                        {isAvailable ? (
                          <a
                            href={video.link}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                          >
                            Ver vídeo
                          </a>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            Inactivo
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isSavingAvailability}
                          onClick={() => {
                            void handleAvailabilityToggle(video.id, !isAvailable);
                          }}
                          aria-label={
                            isAvailable
                              ? "Marcar como no disponible"
                              : "Marcar como disponible"
                          }
                          title={
                            isAvailable
                              ? "Marcar como no disponible"
                              : "Marcar como disponible"
                          }
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm shadow-[0_10px_25px_rgba(2,6,23,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isAvailable
                              ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100 hover:border-rose-300/40 hover:bg-rose-300/12 hover:text-rose-100"
                              : "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:border-emerald-300/35 hover:bg-emerald-300/12 hover:text-emerald-100"
                          }`}
                        >
                          <span className="sr-only">
                            {isAvailable
                              ? "Marcar como no disponible"
                              : "Marcar como disponible"}
                          </span>
                          {isSavingAvailability ? (
                            <LoadingIcon />
                          ) : isAvailable ? (
                            <AvailableIcon />
                          ) : (
                            <UnavailableIcon />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

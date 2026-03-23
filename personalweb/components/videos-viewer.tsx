"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { ShareCardButton } from "@/components/share-card-button";
import type { VideoAsset } from "@/lib/supabase/videos";

type VideosViewerProps = {
  videos: VideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  categoryValue: string;
  platformValue: string;
  categoryOptions: string[];
  platformOptions: string[];
};

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
  categoryOptions,
  platformOptions,
}: VideosViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(filterValue);
  const [selectedCategory, setSelectedCategory] = useState(categoryValue);
  const [selectedPlatform, setSelectedPlatform] = useState(platformValue);
  const hasActiveFilters = Boolean(
    filterValue || categoryValue || platformValue,
  );

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setSelectedCategory(categoryValue);
  }, [categoryValue]);

  useEffect(() => {
    setSelectedPlatform(platformValue);
  }, [platformValue]);

  function applyFilters({
    nextFilterValue,
    nextCategoryValue,
    nextPlatformValue,
  }: {
    nextFilterValue: string;
    nextCategoryValue: string;
    nextPlatformValue: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedFilterValue = nextFilterValue.trim();
    const normalizedCategoryValue = nextCategoryValue.trim();
    const normalizedPlatformValue = nextPlatformValue.trim();

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
    });
  }

  function handleReset() {
    setFilterInput("");
    setSelectedCategory("");
    setSelectedPlatform("");
    applyFilters({
      nextFilterValue: "",
      nextCategoryValue: "",
      nextPlatformValue: "",
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

          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>{totalCount} vídeos cargados</span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
          <form className="space-y-5" onSubmit={handleApply}>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                Filtro
              </p>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_260px_220px_auto_auto] xl:items-center">
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {videos.map((video) => {
              const platformLabel = formatPlatformLabel(video.platform);
              const anchorId = `video-${video.id}`;

              return (
                <article
                  key={video.id}
                  id={anchorId}
                  className="group relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                >
                  <ShareCardButton
                    anchorId={anchorId}
                    sectionId="videos"
                    queryKeys={[
                      "videoFilter",
                      "videoCategory",
                      "videoPlatform",
                    ]}
                    className="absolute right-4 top-4 z-10"
                  />

                  <a
                    href={video.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
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
                    </div>
                  </a>

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
                      <h3 className="text-xl font-semibold leading-tight text-white">
                        {video.title}
                      </h3>
                      {platformLabel ? (
                        <p className="text-sm leading-6 text-slate-300">
                          Disponible en {platformLabel}
                        </p>
                      ) : null}
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

                      {video.info ? (
                        <a
                          href={video.info}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/25 hover:text-white"
                        >
                          Más info
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

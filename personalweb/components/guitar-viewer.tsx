"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { startTransition, useEffect, useState } from "react";

import { ShareCardButton } from "@/components/share-card-button";
import type {
  GuitarTopicAsset,
  GuitarTopicGroupOption,
  GuitarTopicOption,
} from "@/lib/supabase/guitar-topics";
import type { VideoAsset } from "@/lib/supabase/videos";

type GuitarViewerProps = {
  videos: VideoAsset[];
  topics: GuitarTopicAsset[];
  configured: boolean;
  error: string | null;
  generalVideoCount: number;
  totalVideoCount: number;
  totalTopicCount: number;
  totalGroupCount: number;
  groupValue: string;
  topicValue: string;
  groupOptions: GuitarTopicGroupOption[];
  topicOptions: GuitarTopicOption[];
};

function getTopicCountLabel(count: number) {
  return `${count} tema${count === 1 ? "" : "s"}`;
}

function getVideoCountLabel(count: number) {
  return `${count} vídeo${count === 1 ? "" : "s"}`;
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

export function GuitarViewer({
  videos,
  topics,
  configured,
  error,
  generalVideoCount,
  totalVideoCount,
  totalTopicCount,
  totalGroupCount,
  groupValue,
  topicValue,
  groupOptions,
  topicOptions,
}: GuitarViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState(groupValue);
  const [selectedTopic, setSelectedTopic] = useState(topicValue);

  useEffect(() => {
    setSelectedGroup(groupValue);
  }, [groupValue]);

  useEffect(() => {
    setSelectedTopic(topicValue);
  }, [topicValue]);

  const filteredTopicOptions = selectedGroup
    ? topicOptions.filter((option) => option.groupId === selectedGroup)
    : [];
  const activeTopic = topics.find((topic) => topic.id === selectedTopic) ?? null;

  function applySelection({
    nextGroupValue,
    nextTopicValue,
  }: {
    nextGroupValue: string;
    nextTopicValue: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedGroupValue = nextGroupValue.trim();
    const normalizedTopicValue = nextTopicValue.trim();

    if (normalizedGroupValue) {
      params.set("guitarGroup", normalizedGroupValue);
    } else {
      params.delete("guitarGroup");
    }

    if (normalizedTopicValue) {
      params.set("guitarTheme", normalizedTopicValue);
    } else {
      params.delete("guitarTheme");
    }

    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  }

  function handleGroupChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGroupValue = event.target.value;
    const nextTopicOptions = nextGroupValue
      ? topicOptions.filter((option) => option.groupId === nextGroupValue)
      : [];
    const currentTopicStillValid = nextTopicOptions.some(
      (option) => option.id === selectedTopic,
    );
    const nextTopicValue = currentTopicStillValid ? selectedTopic : "";

    setSelectedGroup(nextGroupValue);
    setSelectedTopic(nextTopicValue);
    applySelection({
      nextGroupValue,
      nextTopicValue,
    });
  }

  function handleTopicChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextTopicValue = event.target.value;

    setSelectedTopic(nextTopicValue);
    applySelection({
      nextGroupValue: selectedGroup,
      nextTopicValue,
    });
  }

  function handleClearTopic() {
    setSelectedTopic("");
    applySelection({
      nextGroupValue: selectedGroup,
      nextTopicValue: "",
    });
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Guitarra
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Mástiles, riffs y seis cuerdas...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Selecciona un grupo, elige un tema y abre los vídeos que lo
                explican.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton
              anchorId="guitarra"
              queryKeys={["guitarGroup", "guitarTheme"]}
              className="shrink-0"
            />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>
                {getVideoCountLabel(generalVideoCount)} generales ·{" "}
                {getTopicCountLabel(totalTopicCount)} ·{" "}
                {getVideoCountLabel(totalVideoCount)} en temas
              </span>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar la
            sección de guitarra.
          </div>
        ) : error && videos.length === 0 && topics.length === 0 ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : videos.length === 0 && topics.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay contenido de guitarra cargado todavía.
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {videos.length > 0 ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/75">
                      Bloque
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      Vídeos generales
                    </h3>
                  </div>

                  <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm text-slate-300">
                    {getVideoCountLabel(generalVideoCount)}
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {videos.map((video) => {
                    const platformLabel = formatPlatformLabel(video.platform);
                    const anchorId = `guitarra-video-${video.id}`;

                    return (
                      <article
                        key={video.id}
                        id={anchorId}
                        className="group relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                      >
                        <ShareCardButton
                          anchorId={anchorId}
                          sectionId="guitarra"
                          queryKeys={["guitarGroup", "guitarTheme"]}
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
              </div>
            ) : null}

            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/75">
                    Bloque
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-white">
                    Temas explicados
                  </h3>
                </div>

                <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm text-slate-300">
                  {getTopicCountLabel(totalTopicCount)}
                </span>
              </div>

              {topics.length > 0 ? (
                <>
                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
                    <div className="grid gap-4 xl:grid-cols-[240px_280px_minmax(0,1fr)] xl:items-start">
                      <label className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.32em] text-slate-300">
                          Grupo
                        </span>
                        <select
                          value={selectedGroup}
                          onChange={handleGroupChange}
                          className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                        >
                          <option value="">Selecciona un grupo</option>
                          {groupOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.32em] text-slate-300">
                          Tema
                        </span>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <select
                            value={selectedTopic}
                            onChange={handleTopicChange}
                            disabled={
                              !selectedGroup || filteredTopicOptions.length === 0
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                          >
                            <option value="">
                              {!selectedGroup
                                ? "Primero elige un grupo"
                                : "Selecciona un tema"}
                            </option>
                            {filteredTopicOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleClearTopic}
                            disabled={!selectedTopic}
                            className="rounded-2xl border border-white/12 bg-black/25 px-5 py-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                          >
                            Limpiar tema
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
                        {activeTopic ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-cyan-100">
                                {activeTopic.groupName}
                              </span>
                              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                                {getVideoCountLabel(activeTopic.videos.length)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold text-white">
                                {activeTopic.name}
                              </h3>
                              <p className="text-sm leading-7 text-slate-300">
                                {activeTopic.observations ??
                                  "Sin observaciones añadidas para este tema."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-300/80">
                              Selección
                            </p>
                            <p className="leading-7 text-slate-300">
                              {selectedGroup
                                ? "Elige un tema para ver sus vídeos asociados."
                                : `Hay ${totalGroupCount} grupos con ${getTopicCountLabel(totalTopicCount)} disponibles.`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!activeTopic ? (
                    <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
                      Selecciona un grupo y un tema para mostrar los vídeos
                      explicativos.
                    </div>
                  ) : activeTopic.videos.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
                      Este tema todavía no tiene vídeos asociados.
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {activeTopic.videos.map((video) => {
                        const anchorId = `guitarra-tema-video-${video.id}`;

                        return (
                          <article
                            key={video.id}
                            id={anchorId}
                            className="group relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                          >
                            <ShareCardButton
                              anchorId={anchorId}
                              sectionId="guitarra"
                              queryKeys={["guitarGroup", "guitarTheme"]}
                              className="absolute right-4 top-4 z-10"
                            />

                            <a
                              href={video.link}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <div className="relative flex aspect-[4/3] items-end overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.28),transparent_55%),linear-gradient(180deg,rgba(14,116,144,0.22),rgba(2,6,23,0.98))] p-5">
                                <div className="relative space-y-3">
                                  <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-200/85">
                                    {video.groupName}
                                  </p>
                                  <div className="space-y-1">
                                    <p className="text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
                                      Tema
                                    </p>
                                    <h3 className="text-2xl font-semibold leading-tight text-white">
                                      {video.topicName}
                                    </h3>
                                  </div>
                                </div>
                              </div>
                            </a>

                            <div className="flex flex-1 flex-col gap-4 p-5">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cyan-100">
                                  {video.title}
                                </span>
                                {video.platform ? (
                                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                                    {video.platform}
                                  </span>
                                ) : null}
                              </div>

                              <div className="space-y-2">
                                <h3 className="text-xl font-semibold leading-tight text-white">
                                  {video.title}
                                </h3>
                                <p className="text-sm leading-6 text-slate-300">
                                  {video.observations ??
                                    "Sin observaciones añadidas para este vídeo."}
                                </p>
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
                  )}
                </>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
                  No hay temas de guitarra cargados todavía.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

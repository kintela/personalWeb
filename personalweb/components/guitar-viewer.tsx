"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import { VideoInfoHover } from "@/components/video-info-hover";
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

type SelectedGuitarVideo = {
  title: string;
  subtitle: string;
  externalUrl: string;
  embedUrl: string;
  platform: "youtube" | "instagram" | "vimeo";
};

const GUITAR_VIEWER_GRID_STORAGE_KEY = "guitar-viewer-grid-density";

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

      if (url.pathname === "/playlist") {
        const listId = url.searchParams.get("list");

        if (!listId) {
          return null;
        }

        const embedUrl = new URL("https://www.youtube.com/embed/videoseries");
        embedUrl.searchParams.set("list", listId);

        return embedUrl.toString();
      }

      const videoId = url.searchParams.get("v");

      if (!videoId) {
        const listId = url.searchParams.get("list");

        if (!listId) {
          return null;
        }

        const embedUrl = new URL("https://www.youtube.com/embed/videoseries");
        embedUrl.searchParams.set("list", listId);

        return embedUrl.toString();
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
      if (url.pathname === "/playlist") {
        const listId = url.searchParams.get("list");

        if (!listId) {
          return rawUrl;
        }

        const externalUrl = new URL("https://www.youtube.com/playlist");
        externalUrl.searchParams.set("list", listId);

        return externalUrl.toString();
      }

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
    const normalizedContentType =
      contentType === "reels" ? "reel" : contentType;

    if (
      !normalizedContentType ||
      !contentId ||
      !["p", "reel", "tv"].includes(normalizedContentType)
    ) {
      return null;
    }

    return `https://www.instagram.com/${normalizedContentType}/${contentId}/embed`;
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
    const normalizedContentType =
      contentType === "reels" ? "reel" : contentType;

    if (
      !normalizedContentType ||
      !contentId ||
      !["p", "reel", "tv"].includes(normalizedContentType)
    ) {
      return rawUrl;
    }

    return `https://www.instagram.com/${normalizedContentType}/${contentId}/`;
  } catch {
    return rawUrl;
  }
}

function getVimeoEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname !== "vimeo.com" && hostname !== "player.vimeo.com") {
      return null;
    }

    if (hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      return url.toString();
    }

    const videoId = url.pathname.split("/").filter(Boolean)[0];

    if (!videoId || !/^\d+$/.test(videoId)) {
      return null;
    }

    const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);

    for (const [key, value] of url.searchParams.entries()) {
      embedUrl.searchParams.set(key, value);
    }

    return embedUrl.toString();
  } catch {
    return null;
  }
}

function getVimeoExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      const videoId = url.pathname.split("/").filter(Boolean)[1];

      if (!videoId) {
        return rawUrl;
      }

      return `https://vimeo.com/${videoId}`;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function getGuitarVideoDescriptor(
  rawUrl: string,
  title: string,
  subtitle: string,
): SelectedGuitarVideo | null {
  const youTubeEmbedUrl = getYouTubeEmbedUrl(rawUrl);

  if (youTubeEmbedUrl) {
    return {
      title,
      subtitle,
      externalUrl: getYouTubeExternalUrl(rawUrl),
      embedUrl: youTubeEmbedUrl,
      platform: "youtube",
    };
  }

  const instagramEmbedUrl = getInstagramEmbedUrl(rawUrl);

  if (instagramEmbedUrl) {
    return {
      title,
      subtitle,
      externalUrl: getInstagramExternalUrl(rawUrl),
      embedUrl: instagramEmbedUrl,
      platform: "instagram",
    };
  }

  const vimeoEmbedUrl = getVimeoEmbedUrl(rawUrl);

  if (vimeoEmbedUrl) {
    return {
      title,
      subtitle,
      externalUrl: getVimeoExternalUrl(rawUrl),
      embedUrl: vimeoEmbedUrl,
      platform: "vimeo",
    };
  }

  return null;
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
  const [isClient, setIsClient] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedGuitarVideo | null>(
    null,
  );
  const [selectedGroup, setSelectedGroup] = useState(groupValue);
  const [selectedTopic, setSelectedTopic] = useState(topicValue);
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    GUITAR_VIEWER_GRID_STORAGE_KEY,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  const activeTopicAnchorId = activeTopic ? `guitarra-tema-${activeTopic.id}` : "";
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
  const closeVideoViewer = () => setSelectedVideo(null);

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

  function openVideoViewer(rawUrl: string, title: string, subtitle: string) {
    const descriptor = getGuitarVideoDescriptor(rawUrl, title, subtitle);

    if (!descriptor) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setSelectedVideo(descriptor);
  }

  useEffect(() => {
    if (selectedVideo === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeVideoViewer();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedVideo]);

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

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto lg:justify-end">
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
            <GridDensityControls
              gridDensity={gridDensity}
              setGridDensity={setGridDensity}
              compactTitle="Activar vista compacta de guitarra"
              denseTitle="Activar vista densa de guitarra"
            />
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

                <div className={gridClassName}>
                  {videos.map((video) => {
                    const platformLabel = formatPlatformLabel(video.platform);
                    const anchorId = `guitarra-video-${video.id}`;

                    return (
                      <article
                        key={video.id}
                        id={anchorId}
                        className="relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                      >
                        <ShareCardButton
                          anchorId={anchorId}
                          sectionId="guitarra"
                          queryKeys={["guitarGroup", "guitarTheme"]}
                          className="absolute right-4 top-4 z-10"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            openVideoViewer(
                              video.link,
                              video.title,
                              platformLabel
                                ? `${platformLabel} · vídeo general`
                                : "Vídeo general",
                            )
                          }
                          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-inset"
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
                          </button>

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
                            <button
                              type="button"
                              onClick={() =>
                                openVideoViewer(
                                  video.link,
                                  video.title,
                                  platformLabel
                                    ? `${platformLabel} · vídeo general`
                                    : "Vídeo general",
                                )
                              }
                              className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                            >
                              Ver vídeo
                            </button>
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

                      <div
                        id={activeTopicAnchorId || undefined}
                        className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300 scroll-mt-32"
                      >
                        {activeTopic ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-cyan-100">
                                  {activeTopic.groupName}
                                </span>
                                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                                  {getVideoCountLabel(activeTopic.videos.length)}
                                </span>
                              </div>

                              <ShareCardButton
                                anchorId={activeTopicAnchorId}
                                sectionId="guitarra"
                                queryKeys={["guitarGroup", "guitarTheme"]}
                                className="shrink-0"
                              />
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
                    <div className={gridClassName}>
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

                            <button
                              type="button"
                              onClick={() =>
                                openVideoViewer(
                                  video.link,
                                  video.topicName,
                                  video.platform
                                    ? `${video.title} · ${video.platform}`
                                    : video.title,
                                )
                              }
                              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-inset"
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
                            </button>

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
                                <button
                                  type="button"
                                  onClick={() =>
                                    openVideoViewer(
                                      video.link,
                                      video.topicName,
                                      video.platform
                                        ? `${video.title} · ${video.platform}`
                                        : video.title,
                                    )
                                  }
                                  className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                                >
                                  Ver vídeo
                                </button>
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

      {isClient && selectedVideo
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-slate-950/92 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                aria-label="Cerrar visor de video"
                className="absolute inset-0 cursor-default"
                onClick={closeVideoViewer}
              />

              <div className="relative z-10 h-full overflow-y-auto px-4 py-6">
                <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center">
                  <div className="flex w-full flex-col gap-4">
                    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {selectedVideo.title}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                          {selectedVideo.subtitle} ·{" "}
                          {selectedVideo.platform === "youtube"
                            ? "YouTube"
                            : selectedVideo.platform === "instagram"
                              ? "Instagram"
                              : "Vimeo"}
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
                            ? "mx-auto h-[min(75vh,760px)] min-h-[540px] w-full max-w-[420px]"
                            : "w-full aspect-video h-auto max-h-[calc(100vh-13rem)] min-h-[320px]"
                        }
                      >
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

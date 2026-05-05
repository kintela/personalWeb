"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
  GuitarTopicTablatureAsset,
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
  platform: "youtube" | "instagram" | "vimeo" | "onedrive";
};

type SelectedGuitarLyric = {
  title: string;
  subtitle: string;
  imageSrc: string;
};

type SelectedGuitarTablature = {
  title: string;
  subtitle: string;
  images: GuitarTopicTablatureAsset[];
  activeIndex: number;
};

type TopicContextState = {
  tablatureImages: GuitarTopicTablatureAsset[];
  hasLoadedTablatures: boolean;
  spotifyUrl: string | null;
  hasLoadedSpotify: boolean;
};

const GUITAR_VIEWER_GRID_STORAGE_KEY = "guitar-viewer-grid-density";
const LYRIC_ZOOM_MIN = 0.75;
const LYRIC_ZOOM_MAX = 2.5;
const LYRIC_ZOOM_STEP = 0.25;

function getTopicCountLabel(count: number) {
  return `${count} tema${count === 1 ? "" : "s"}`;
}

function getVideoCountLabel(count: number) {
  return `${count} vídeo${count === 1 ? "" : "s"}`;
}

function getTablatureCountLabel(count: number) {
  return `${count} tablatura${count === 1 ? "" : "s"}`;
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

function getOneDriveEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (
      hostname !== "1drv.ms" &&
      hostname !== "onedrive.live.com" &&
      !hostname.endsWith(".sharepoint.com")
    ) {
      return null;
    }

    if (
      hostname.endsWith(".sharepoint.com") &&
      url.pathname.toLowerCase().includes("/_layouts/15/embed.aspx")
    ) {
      return url.toString();
    }

    const embedUrl = new URL(url.toString());

    embedUrl.searchParams.set("embed", "1");
    embedUrl.searchParams.delete("download");

    return embedUrl.toString();
  } catch {
    return null;
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

  const oneDriveEmbedUrl = getOneDriveEmbedUrl(rawUrl);

  if (oneDriveEmbedUrl) {
    return {
      title,
      subtitle,
      externalUrl: rawUrl,
      embedUrl: oneDriveEmbedUrl,
      platform: "onedrive",
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
  const [isClient, setIsClient] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedGuitarVideo | null>(
    null,
  );
  const [selectedLyricImage, setSelectedLyricImage] =
    useState<SelectedGuitarLyric | null>(null);
  const [selectedTablature, setSelectedTablature] =
    useState<SelectedGuitarTablature | null>(null);
  const [selectedGroup, setSelectedGroup] = useState(groupValue);
  const [selectedTopic, setSelectedTopic] = useState(topicValue);
  const [lyricZoom, setLyricZoom] = useState(1);
  const [lyricImageNaturalSize, setLyricImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [lyricViewportSize, setLyricViewportSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    GUITAR_VIEWER_GRID_STORAGE_KEY,
  );
  const lyricViewportRef = useRef<HTMLDivElement | null>(null);
  const lyricDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const [topicContextById, setTopicContextById] = useState<
    Record<string, TopicContextState>
  >(() => {
    const initialTopic = topics.find((topic) => topic.id === topicValue);

    if (!topicValue || !initialTopic) {
      return {};
    }

    return {
      [topicValue]: {
        tablatureImages: initialTopic.tablatureImages,
        hasLoadedTablatures: true,
        spotifyUrl: initialTopic.spotifyUrl,
        hasLoadedSpotify: Boolean(initialTopic.spotifyUrl),
      },
    };
  });
  const [tablatureLoadingTopicId, setTablatureLoadingTopicId] =
    useState<string | null>(null);
  const [spotifyLoadingTopicId, setSpotifyLoadingTopicId] =
    useState<string | null>(null);
  const [topicContextError, setTopicContextError] = useState<string | null>(null);
  const [showCompactGeneralVideos, setShowCompactGeneralVideos] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setSelectedGroup(groupValue);
  }, [groupValue]);

  useEffect(() => {
    setSelectedTopic(topicValue);
  }, [topicValue]);

  useEffect(() => {
    setLyricZoom(1);
    setLyricImageNaturalSize(null);
    setLyricViewportSize(null);
  }, [selectedLyricImage]);

  useEffect(() => {
    if (!selectedLyricImage) {
      return;
    }

    const viewport = lyricViewportRef.current;

    if (!viewport) {
      return;
    }

    const updateViewportSize = () => {
      setLyricViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateViewportSize();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportSize();
    });

    resizeObserver.observe(viewport);
    window.addEventListener("resize", updateViewportSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [selectedLyricImage]);

  useEffect(() => {
    if (!topicValue) {
      return;
    }

    const initialTopic = topics.find((topic) => topic.id === topicValue);

    if (!initialTopic) {
      return;
    }

    setTopicContextById((currentValue) => ({
      ...currentValue,
      [topicValue]: {
        tablatureImages: initialTopic.tablatureImages,
        hasLoadedTablatures: true,
        spotifyUrl:
          currentValue[topicValue]?.hasLoadedSpotify === true
            ? currentValue[topicValue]?.spotifyUrl ?? null
            : initialTopic.spotifyUrl,
        hasLoadedSpotify:
          currentValue[topicValue]?.hasLoadedSpotify ??
          Boolean(initialTopic.spotifyUrl),
      },
    }));
  }, [topicValue, topics]);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);

      setSelectedGroup(params.get("guitarGroup")?.trim() ?? "");
      setSelectedTopic(params.get("guitarTheme")?.trim() ?? "");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isClient]);

  const filteredTopicOptions = selectedGroup
    ? topicOptions.filter((option) => option.groupId === selectedGroup)
    : [];
  const baseActiveTopic = topics.find((topic) => topic.id === selectedTopic) ?? null;
  const activeTopicContext = baseActiveTopic
    ? topicContextById[baseActiveTopic.id] ?? null
    : null;
  const activeTopic = baseActiveTopic
    ? {
        ...baseActiveTopic,
        tablatureImages:
          activeTopicContext?.tablatureImages ?? baseActiveTopic.tablatureImages,
      }
    : null;
  const activeTopicSpotifyUrl = activeTopic?.spotifyUrl ?? null;
  const activeSpotifyUrl =
    activeTopicContext?.spotifyUrl ?? activeTopicSpotifyUrl;
  const activeTopicId = activeTopic?.id ?? "";
  const activeTopicName = activeTopic?.name ?? "";
  const activeTopicGroupName = activeTopic?.groupName ?? "";
  const activeTopicAnchorId = activeTopic ? `guitarra-tema-${activeTopic.id}` : "";
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
  const closeVideoViewer = () => setSelectedVideo(null);
  const closeLyricViewer = () => setSelectedLyricImage(null);
  const closeTablatureViewer = () => setSelectedTablature(null);
  const increaseLyricZoom = () =>
    setLyricZoom((currentValue) =>
      Math.min(LYRIC_ZOOM_MAX, currentValue + LYRIC_ZOOM_STEP),
    );
  const decreaseLyricZoom = () =>
    setLyricZoom((currentValue) =>
      Math.max(LYRIC_ZOOM_MIN, currentValue - LYRIC_ZOOM_STEP),
    );
  const resetLyricZoom = () => setLyricZoom(1);

  function handleLyricPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (lyricZoom <= 1) {
      return;
    }

    const viewport = lyricViewportRef.current;

    if (!viewport) {
      return;
    }

    lyricDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    };

    viewport.setPointerCapture(event.pointerId);
  }

  function handleLyricPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = lyricViewportRef.current;
    const dragState = lyricDragStateRef.current;

    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    viewport.scrollLeft = dragState.startScrollLeft - deltaX;
    viewport.scrollTop = dragState.startScrollTop - deltaY;
  }

  function handleLyricPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = lyricViewportRef.current;
    const dragState = lyricDragStateRef.current;

    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    lyricDragStateRef.current = null;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }

  function applySelection({
    nextGroupValue,
    nextTopicValue,
  }: {
    nextGroupValue: string;
    nextTopicValue: string;
  }) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
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

    const query = params.toString();
    const href = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;

    window.history.replaceState(window.history.state, "", href);
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

  function openLyricViewer(imageSrc: string, title: string, subtitle: string) {
    setSelectedLyricImage({
      title,
      subtitle,
      imageSrc,
    });
  }

  function openTablatureViewer(
    images: GuitarTopicTablatureAsset[],
    title: string,
    subtitle: string,
    activeIndex = 0,
  ) {
    if (images.length === 0) {
      return;
    }

    setSelectedTablature({
      title,
      subtitle,
      images,
      activeIndex,
    });
  }

  function setActiveTablatureIndex(nextIndex: number) {
    setSelectedTablature((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      if (nextIndex < 0 || nextIndex >= currentValue.images.length) {
        return currentValue;
      }

      return {
        ...currentValue,
        activeIndex: nextIndex,
      };
    });
  }

  useEffect(() => {
    if (
      selectedVideo === null &&
      selectedLyricImage === null &&
      selectedTablature === null
    ) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeVideoViewer();
        closeLyricViewer();
        closeTablatureViewer();
        return;
      }

      if (!selectedTablature) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveTablatureIndex(selectedTablature.activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveTablatureIndex(selectedTablature.activeIndex + 1);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedLyricImage, selectedTablature, selectedVideo]);

  const activeTablatureImage = selectedTablature
    ? selectedTablature.images[selectedTablature.activeIndex] ?? null
    : null;
  const generalVideosWithCover = videos.filter((video) => Boolean(video.imageSrc));
  const generalVideosWithoutCover = videos.filter((video) => !video.imageSrc);
  const lyricImageBaseWidth =
    lyricImageNaturalSize && lyricViewportSize
      ? Math.min(
          lyricViewportSize.width,
          lyricViewportSize.height *
            (lyricImageNaturalSize.width / lyricImageNaturalSize.height),
        )
      : null;
  const lyricImageWidth = lyricImageBaseWidth
    ? Math.round(lyricImageBaseWidth * lyricZoom)
    : null;
  const lyricImageHeight =
    lyricImageNaturalSize && lyricImageWidth
      ? Math.round(
          lyricImageWidth *
            (lyricImageNaturalSize.height / lyricImageNaturalSize.width),
        )
      : null;

  useEffect(() => {
    setTopicContextError(null);
  }, [selectedTopic]);

  useEffect(() => {
    if (!activeTopicId || activeTopicContext?.hasLoadedTablatures) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ topicId: activeTopicId });

    setTablatureLoadingTopicId(activeTopicId);
    setTopicContextError(null);

    void fetch(`/api/guitar/tablatures?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          error?: string | null;
          images?: GuitarTopicTablatureAsset[];
        };

        if (!response.ok) {
          throw new Error(result.error ?? "No he podido leer las tablaturas.");
        }

        setTopicContextById((currentValue) => {
          const currentTopicContext = currentValue[activeTopicId];

          return {
            ...currentValue,
            [activeTopicId]: {
              tablatureImages: Array.isArray(result.images) ? result.images : [],
              hasLoadedTablatures: true,
              spotifyUrl: currentTopicContext?.spotifyUrl ?? activeTopicSpotifyUrl,
              hasLoadedSpotify:
                currentTopicContext?.hasLoadedSpotify ??
                Boolean(activeTopicSpotifyUrl),
            },
          };
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setTopicContextById((currentValue) => {
          const currentTopicContext = currentValue[activeTopicId];

          return {
            ...currentValue,
            [activeTopicId]: {
              tablatureImages: currentTopicContext?.tablatureImages ?? [],
              hasLoadedTablatures: true,
              spotifyUrl: currentTopicContext?.spotifyUrl ?? activeTopicSpotifyUrl,
              hasLoadedSpotify:
                currentTopicContext?.hasLoadedSpotify ??
                Boolean(activeTopicSpotifyUrl),
            },
          };
        });
        setTopicContextError(
          error instanceof Error
            ? error.message
            : "No he podido cargar las tablaturas del tema.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTablatureLoadingTopicId((currentValue) =>
            currentValue === activeTopicId ? null : currentValue,
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeTopicContext?.hasLoadedTablatures, activeTopicId, activeTopicSpotifyUrl]);

  useEffect(() => {
    if (
      !activeTopicId ||
      !activeTopicName ||
      !activeTopicGroupName ||
      activeTopicContext?.hasLoadedSpotify ||
      Boolean(activeTopicSpotifyUrl)
    ) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      topicId: activeTopicId,
      topicName: activeTopicName,
      groupName: activeTopicGroupName,
    });

    setSpotifyLoadingTopicId(activeTopicId);

    void fetch(`/api/spotify/topic-match?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          error?: string | null;
          spotifyUrl?: string | null;
        };

        if (!response.ok) {
          throw new Error(
            result.error ?? "No he podido buscar el tema en Spotify.",
          );
        }

        const spotifyUrl =
          typeof result.spotifyUrl === "string" && result.spotifyUrl.trim()
            ? result.spotifyUrl.trim()
            : null;

        setTopicContextById((currentValue) => {
          const currentTopicContext = currentValue[activeTopicId];

          return {
            ...currentValue,
            [activeTopicId]: {
              tablatureImages: currentTopicContext?.tablatureImages ?? [],
              hasLoadedTablatures:
                currentTopicContext?.hasLoadedTablatures ?? false,
              spotifyUrl,
              hasLoadedSpotify: true,
            },
          };
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setTopicContextById((currentValue) => {
          const currentTopicContext = currentValue[activeTopicId];

          return {
            ...currentValue,
            [activeTopicId]: {
              tablatureImages: currentTopicContext?.tablatureImages ?? [],
              hasLoadedTablatures:
                currentTopicContext?.hasLoadedTablatures ?? false,
              spotifyUrl: null,
              hasLoadedSpotify: true,
            },
          };
        });
        setTopicContextError(
          error instanceof Error
            ? error.message
            : "No he podido buscar el tema en Spotify.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSpotifyLoadingTopicId((currentValue) =>
            currentValue === activeTopicId ? null : currentValue,
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    activeTopicContext?.hasLoadedSpotify,
    activeTopicGroupName,
    activeTopicId,
    activeTopicName,
    activeTopicSpotifyUrl,
  ]);

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
                Selecciona un grupo, elige un tema y abre sus vídeos,
                tablaturas o la letra asociada cuando existan.
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

                {generalVideosWithCover.length > 0 ? (
                  <div className={gridClassName}>
                    {generalVideosWithCover.map((video) => {
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
                              <Image
                                src={video.imageSrc ?? ""}
                                alt={`Carátula de ${video.title}`}
                                fill
                                unoptimized
                                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
                              />
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
                ) : null}

                {generalVideosWithoutCover.length > 0 ? (
                  <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/35">
                    <button
                      type="button"
                      onClick={() =>
                        setShowCompactGeneralVideos((currentValue) => !currentValue)
                      }
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                      aria-expanded={showCompactGeneralVideos}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">
                          Vídeos sin carátula
                        </p>
                        <p className="text-sm text-slate-300">
                          {getVideoCountLabel(generalVideosWithoutCover.length)} en
                          formato compacto
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                        {showCompactGeneralVideos ? "Ocultar" : "Mostrar"}
                      </span>
                    </button>

                    {showCompactGeneralVideos ? (
                      <div className="border-t border-white/10 px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {generalVideosWithoutCover.map((video) => {
                            const platformLabel = formatPlatformLabel(video.platform);
                            const anchorId = `guitarra-video-${video.id}`;

                            return (
                              <article
                                key={video.id}
                                id={anchorId}
                                className="flex scroll-mt-32 items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3"
                              >
                                <div className="min-w-0 space-y-2">
                                  {platformLabel ? (
                                    <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                                      {platformLabel}
                                    </span>
                                  ) : null}
                                  <p className="text-sm font-medium leading-6 text-white">
                                    {video.title}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  <ShareCardButton
                                    anchorId={anchorId}
                                    sectionId="guitarra"
                                    queryKeys={["guitarGroup", "guitarTheme"]}
                                    className="shrink-0"
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
                                    className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                                  >
                                    Ver vídeo
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
                                {activeTopic.tablatureImages.length > 0 ? (
                                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200">
                                    {getTablatureCountLabel(
                                      activeTopic.tablatureImages.length,
                                    )}
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-3">
                                {activeSpotifyUrl ? (
                                  <a
                                    href={activeSpotifyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/65 hover:bg-emerald-300/18 hover:text-white"
                                  >
                                    Abrir tema en Spotify
                                  </a>
                                ) : spotifyLoadingTopicId === activeTopic.id ? (
                                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100/80">
                                    Buscando Spotify...
                                  </span>
                                ) : null}

                                {activeTopic.tablatureImages.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openTablatureViewer(
                                        activeTopic.tablatureImages,
                                        activeTopic.name,
                                        activeTopic.groupName,
                                      )
                                    }
                                    className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                                  >
                                    {activeTopic.tablatureImages.length === 1
                                      ? "Ver tablatura"
                                      : "Ver tablaturas"}
                                  </button>
                                ) : tablatureLoadingTopicId === activeTopic.id ? (
                                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/80">
                                    Cargando tablaturas...
                                  </span>
                                ) : null}

                                {activeTopic.lyricImageSrc ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openLyricViewer(
                                        activeTopic.lyricImageSrc ?? "",
                                        activeTopic.name,
                                        activeTopic.groupName,
                                      )
                                    }
                                    className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                                  >
                                    Ver letra
                                  </button>
                                ) : null}

                                <ShareCardButton
                                  anchorId={activeTopicAnchorId}
                                  sectionId="guitarra"
                                  queryKeys={["guitarGroup", "guitarTheme"]}
                                  className="shrink-0"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold text-white">
                                {activeTopic.name}
                              </h3>
                              <p className="text-sm leading-7 text-slate-300">
                                {activeTopic.observations ??
                                  "Sin observaciones añadidas para este tema."}
                              </p>
                              {topicContextError ? (
                                <p className="text-xs leading-6 text-rose-200/85">
                                  {topicContextError}
                                </p>
                              ) : null}
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

      {isClient && selectedLyricImage
        ? createPortal(
            <div
              className="fixed inset-0 z-[105] bg-slate-950/94 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-label={`Letra de ${selectedLyricImage.title}`}
            >
              <button
                type="button"
                aria-label="Cerrar visor de letra"
                className="absolute inset-0 cursor-default"
                onClick={closeLyricViewer}
              />

              <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-4xl">
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {selectedLyricImage.title}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                          {selectedLyricImage.subtitle} · letra
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-2 py-2">
                          <button
                            type="button"
                            onClick={decreaseLyricZoom}
                            disabled={lyricZoom <= LYRIC_ZOOM_MIN}
                            className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={resetLyricZoom}
                            className="min-w-16 rounded-full border border-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
                          >
                            {Math.round(lyricZoom * 100)}%
                          </button>
                          <button
                            type="button"
                            onClick={increaseLyricZoom}
                            disabled={lyricZoom >= LYRIC_ZOOM_MAX}
                            className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={closeLyricViewer}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/45 p-3 sm:p-4">
                      <div
                        ref={lyricViewportRef}
                        onPointerDown={handleLyricPointerDown}
                        onPointerMove={handleLyricPointerMove}
                        onPointerUp={handleLyricPointerUp}
                        onPointerCancel={handleLyricPointerUp}
                        className={`max-h-[calc(100vh-10rem)] overflow-auto ${
                          lyricZoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                        style={{ touchAction: "none" }}
                      >
                        <div
                          className={`flex ${
                            lyricImageWidth &&
                            lyricViewportSize &&
                            lyricImageWidth < lyricViewportSize.width
                              ? "justify-center"
                              : "justify-start"
                          } ${
                            lyricImageHeight &&
                            lyricViewportSize &&
                            lyricImageHeight < lyricViewportSize.height
                              ? "items-center"
                              : "items-start"
                          }`}
                          style={{
                            minWidth: lyricViewportSize
                              ? `${lyricViewportSize.width}px`
                              : "100%",
                            minHeight: lyricViewportSize
                              ? `${lyricViewportSize.height}px`
                              : "auto",
                            width: lyricImageWidth ? `${lyricImageWidth}px` : "100%",
                            height: lyricImageHeight
                              ? `${lyricImageHeight}px`
                              : "auto",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedLyricImage.imageSrc}
                            alt={`Letra de ${selectedLyricImage.title}`}
                            draggable={false}
                            onDragStart={(event) => event.preventDefault()}
                            className="block h-auto max-w-none rounded-[1.1rem] object-contain select-none"
                            onLoad={(event) => {
                              setLyricImageNaturalSize({
                                width: event.currentTarget.naturalWidth,
                                height: event.currentTarget.naturalHeight,
                              });
                            }}
                            style={{
                              width: lyricImageWidth
                                ? `${lyricImageWidth}px`
                                : `${Math.round(lyricZoom * 100)}%`,
                            }}
                          />
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

      {isClient && selectedTablature && activeTablatureImage
        ? createPortal(
            <div
              className="fixed inset-0 z-[106] bg-slate-950/94 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-label={`Tablatura de ${selectedTablature.title}`}
            >
              <button
                type="button"
                aria-label="Cerrar visor de tablatura"
                className="absolute inset-0 cursor-default"
                onClick={closeTablatureViewer}
              />

              <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-6xl">
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 text-sm text-slate-200">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {selectedTablature.title}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-400">
                          {selectedTablature.subtitle} · tablatura{" "}
                          {selectedTablature.activeIndex + 1} de{" "}
                          {selectedTablature.images.length}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTablatureIndex(
                              selectedTablature.activeIndex - 1,
                            )
                          }
                          disabled={selectedTablature.activeIndex === 0}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTablatureIndex(
                              selectedTablature.activeIndex + 1,
                            )
                          }
                          disabled={
                            selectedTablature.activeIndex >=
                            selectedTablature.images.length - 1
                          }
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-slate-500"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          onClick={closeTablatureViewer}
                          className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/45 p-3 sm:p-4">
                      <div className="flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeTablatureImage.imageSrc}
                          alt={`Tablatura ${activeTablatureImage.pageNumber} de ${selectedTablature.title}`}
                          className="h-auto max-h-[calc(100vh-14rem)] w-auto max-w-full rounded-[1.1rem] object-contain"
                        />
                      </div>
                    </div>

                    {selectedTablature.images.length > 1 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                        {selectedTablature.images.map((image, index) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setActiveTablatureIndex(index)}
                            className={`overflow-hidden rounded-[1.2rem] border p-2 text-left transition ${
                              index === selectedTablature.activeIndex
                                ? "border-cyan-300/60 bg-cyan-300/10"
                                : "border-white/10 bg-black/20 hover:border-white/30"
                            }`}
                          >
                            <div className="aspect-[3/4] overflow-hidden rounded-[0.9rem] bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.imageSrc}
                                alt={`Miniatura de la tablatura ${image.pageNumber}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-slate-300">
                              Página {image.pageNumber}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                              : selectedVideo.platform === "onedrive"
                                ? "OneDrive"
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

                    {selectedVideo.platform === "onedrive" ? (
                      <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
                        Si SharePoint bloquea este vídeo dentro del visor, usa{" "}
                        <span className="font-semibold text-white">
                          Abrir fuera
                        </span>
                        .
                      </div>
                    ) : null}
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

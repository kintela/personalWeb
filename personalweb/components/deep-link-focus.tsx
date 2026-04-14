"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SECTION_IDS = new Set([
  "fotos",
  "conciertos",
  "discos",
  "cds",
  "vinilos",
  "libros",
  "historia",
  "guitarra",
  "instagram",
  "spotify",
  "videos",
]);

const TARGET_SECTION_PREFIXES = [
  { prefix: "foto-", sectionId: "fotos" },
  { prefix: "concierto-", sectionId: "conciertos" },
  { prefix: "disco-", sectionId: "discos" },
  { prefix: "cd-", sectionId: "cds" },
  { prefix: "vinilo-", sectionId: "vinilos" },
  { prefix: "libro-", sectionId: "libros" },
  { prefix: "historia-video-", sectionId: "historia" },
  { prefix: "guitarra-video-", sectionId: "guitarra" },
  { prefix: "guitarra-tema-", sectionId: "guitarra" },
  { prefix: "guitarra-tema-video-", sectionId: "guitarra" },
  { prefix: "instagram-media-", sectionId: "instagram" },
  { prefix: "spotify-playlist-", sectionId: "spotify" },
  { prefix: "spotify-playlist-viewer-", sectionId: "spotify" },
  { prefix: "spotify-track-", sectionId: "spotify" },
  { prefix: "video-", sectionId: "videos" },
] as const;

function getHashTarget() {
  const rawHash = window.location.hash.slice(1).trim();

  if (!rawHash) {
    return null;
  }

  return decodeURIComponent(rawHash);
}

function getSectionIdFromTarget(targetId: string | null) {
  if (!targetId) {
    return null;
  }

  if (SECTION_IDS.has(targetId)) {
    return targetId;
  }

  const matchedPrefix = TARGET_SECTION_PREFIXES.find(({ prefix }) =>
    targetId.startsWith(prefix),
  );

  return matchedPrefix?.sectionId ?? null;
}

export function DeepLinkFocus() {
  const searchParams = useSearchParams();
  const focusTargetId = searchParams.get("focus");

  useEffect(() => {
    let animationFrameId = 0;
    let clearHighlightTimeoutId = 0;
    const settleTimeoutIds: number[] = [];
    let attempts = 0;
    let highlightedElement: HTMLElement | null = null;
    let didScheduleSettling = false;

    const hashTarget = getHashTarget();
    const targetId = focusTargetId ?? hashTarget;
    const sectionId = getSectionIdFromTarget(focusTargetId ?? hashTarget);

    if (!targetId) {
      return;
    }

    if (focusTargetId && hashTarget !== focusTargetId) {
      const nextHash = `#${encodeURIComponent(focusTargetId)}`;

      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}${nextHash}`,
      );
    }

    const highlightTarget = (element: HTMLElement) => {
      highlightedElement = element;
      element.style.transition =
        "box-shadow 220ms ease, border-color 220ms ease";
      element.style.boxShadow =
        "0 0 0 3px rgba(34, 211, 238, 0.55), 0 18px 50px rgba(17, 24, 39, 0.42)";
      element.style.borderColor = "rgba(103, 232, 249, 0.7)";

      clearHighlightTimeoutId = window.setTimeout(() => {
        if (!highlightedElement) {
          return;
        }

        highlightedElement.style.boxShadow = "";
        highlightedElement.style.borderColor = "";
        highlightedElement = null;
      }, 2200);
    };

    const scheduleSettling = () => {
      if (didScheduleSettling) {
        return;
      }

      didScheduleSettling = true;

      for (const delay of [160, 420, 900, 1600]) {
        settleTimeoutIds.push(
          window.setTimeout(() => {
            const targetElement = document.getElementById(targetId);

            if (!targetElement) {
              return;
            }

            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            highlightTarget(targetElement);
          }, delay),
        );
      }
    };

    const scrollToTarget = (behavior: ScrollBehavior) => {
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior,
          block: "start",
        });
        highlightTarget(targetElement);
        scheduleSettling();
        return true;
      }

      if (attempts === 1 && sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }

      return false;
    };

    const retryScroll = () => {
      attempts += 1;

      if (scrollToTarget(attempts === 1 ? "auto" : "smooth")) {
        return;
      }

      if (attempts < 120) {
        animationFrameId = window.requestAnimationFrame(retryScroll);
      }
    };

    const handlePageShow = () => {
      settleTimeoutIds.push(
        window.setTimeout(() => {
          scrollToTarget("smooth");
        }, 120),
      );
    };

    animationFrameId = window.requestAnimationFrame(retryScroll);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("load", handlePageShow);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(clearHighlightTimeoutId);

      for (const timeoutId of settleTimeoutIds) {
        window.clearTimeout(timeoutId);
      }

      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("load", handlePageShow);

      if (highlightedElement) {
        highlightedElement.style.boxShadow = "";
        highlightedElement.style.borderColor = "";
      }
    };
  }, [focusTargetId]);

  return null;
}

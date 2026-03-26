"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SECTION_IDS = new Set([
  "fotos",
  "conciertos",
  "cds",
  "vinilos",
  "libros",
  "historia",
  "guitarra",
  "videos",
]);

const TARGET_SECTION_PREFIXES = [
  { prefix: "foto-", sectionId: "fotos" },
  { prefix: "concierto-", sectionId: "conciertos" },
  { prefix: "cd-", sectionId: "cds" },
  { prefix: "vinilo-", sectionId: "vinilos" },
  { prefix: "libro-", sectionId: "libros" },
  { prefix: "historia-video-", sectionId: "historia" },
  { prefix: "guitarra-video-", sectionId: "guitarra" },
  { prefix: "guitarra-tema-", sectionId: "guitarra" },
  { prefix: "guitarra-tema-video-", sectionId: "guitarra" },
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
    let attempts = 0;
    let highlightedElement: HTMLElement | null = null;

    const hashTarget = getHashTarget();
    const targetId = focusTargetId ?? hashTarget;
    const sectionId = getSectionIdFromTarget(hashTarget ?? focusTargetId);

    if (!targetId) {
      return;
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

    const scrollToTarget = () => {
      attempts += 1;
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: attempts === 1 ? "auto" : "smooth",
          block: "center",
        });
        highlightTarget(targetElement);
        return;
      }

      if (attempts === 1 && sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }

      if (attempts < 48) {
        animationFrameId = window.requestAnimationFrame(scrollToTarget);
      }
    };

    animationFrameId = window.requestAnimationFrame(scrollToTarget);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(clearHighlightTimeoutId);

      if (highlightedElement) {
        highlightedElement.style.boxShadow = "";
        highlightedElement.style.borderColor = "";
      }
    };
  }, [focusTargetId]);

  return null;
}

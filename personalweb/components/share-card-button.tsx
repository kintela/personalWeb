"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

type ShareCardButtonProps = {
  anchorId: string;
  sectionId?: string;
  className?: string;
  queryKeys?: readonly string[];
};

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 12v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
    </svg>
  );
}

function CheckIcon() {
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
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function ShareCardButton({
  anchorId,
  sectionId,
  className,
  queryKeys = [],
}: ShareCardButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const params = new URLSearchParams();

    for (const key of queryKeys) {
      for (const value of searchParams.getAll(key)) {
        params.append(key, value);
      }
    }

    params.delete("focus");

    if (sectionId) {
      params.set("focus", anchorId);
    }

    const query = params.toString();
    const shareTarget = sectionId ?? anchorId;
    const shareUrl = `${window.location.origin}${pathname}${query ? `?${query}` : ""}#${shareTarget}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt("Copia este enlace:", shareUrl);
    }
  }

  const label = copied ? "Enlace copiado" : "Copiar enlace";

  return (
    <button
      type="button"
      onClick={(event) => {
        void handleClick(event);
      }}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/72 text-slate-100 shadow-[0_10px_25px_rgba(2,6,23,0.35)] backdrop-blur transition hover:border-cyan-300/60 hover:bg-cyan-300/14 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
        copied
          ? "border-emerald-300/50 bg-emerald-300/14 text-emerald-100"
          : ""
      } ${className ?? ""}`}
    >
      <span className="sr-only">{label}</span>
      {copied ? <CheckIcon /> : <ShareIcon />}
    </button>
  );
}

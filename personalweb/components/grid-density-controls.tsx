"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

export type GridDensity = "default" | "compact" | "dense";

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

export function usePersistedGridDensity(storageKey: string) {
  const [gridDensity, setGridDensity] = useState<GridDensity>("default");
  const [hasHydratedGridDensity, setHasHydratedGridDensity] = useState(false);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(storageKey) as
      | GridDensity
      | null;
    const nextGridDensity: GridDensity =
      savedValue === "compact" ||
      savedValue === "dense" ||
      savedValue === "default"
        ? savedValue
        : "default";

    const animationFrameId = window.requestAnimationFrame(() => {
      setGridDensity(nextGridDensity);
      setHasHydratedGridDensity(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hasHydratedGridDensity) {
      return;
    }

    window.localStorage.setItem(storageKey, gridDensity);
  }, [gridDensity, hasHydratedGridDensity, storageKey]);

  return [gridDensity, setGridDensity] as const;
}

export function GridDensityControls({
  gridDensity,
  setGridDensity,
  compactTitle = "Ver más tarjetas por fila",
  denseTitle = "Ver aún más tarjetas por fila",
  className,
}: {
  gridDensity: GridDensity;
  setGridDensity: Dispatch<SetStateAction<GridDensity>>;
  compactTitle?: string;
  denseTitle?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        title={gridDensity === "compact" ? "Volver al tamaño normal" : compactTitle}
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
            : compactTitle}
        </span>
        <GridDensityIcon active={gridDensity === "compact"} columns={4} />
      </button>

      <button
        type="button"
        title={gridDensity === "dense" ? "Volver al tamaño normal" : denseTitle}
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
            : denseTitle}
        </span>
        <GridDensityIcon active={gridDensity === "dense"} columns={6} />
      </button>
    </div>
  );
}

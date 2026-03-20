"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useEffectEvent } from "react";

import type { PhotoAsset } from "@/lib/supabase/photos";

type PhotoViewerProps = {
  photos: PhotoAsset[];
  bucketName: string;
  configured: boolean;
  error: string | null;
  totalCount: number;
  loadedCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

function buildPhotoMeta(photo: PhotoAsset) {
  return [photo.dateLabel, photo.origin, photo.place].filter(Boolean).join(" · ");
}

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function PhotoViewer({
  photos,
  bucketName,
  configured,
  error,
  totalCount,
  loadedCount,
  currentPage,
  totalPages,
  pageSize,
}: PhotoViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const visiblePages = buildVisiblePages(currentPage, totalPages);
  const firstPosition = (currentPage - 1) * pageSize + 1;
  const lastPosition =
    loadedCount === 0 ? 0 : firstPosition + loadedCount - 1;

  const selectedPhoto =
    selectedIndex === null ? null : photos.at(selectedIndex) ?? null;

  const closeViewer = () => setSelectedIndex(null);

  const showPreviousPhoto = () => {
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === 0 ? photos.length - 1 : current - 1;
    });
  };

  const showNextPhoto = () => {
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === photos.length - 1 ? 0 : current + 1;
    });
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (selectedIndex === null) {
      return;
    }

    if (event.key === "Escape") {
      closeViewer();
    }

    if (event.key === "ArrowLeft") {
      showPreviousPhoto();
    }

    if (event.key === "ArrowRight") {
      showNextPhoto();
    }
  });

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIndex]);

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    let previousPage = 0;

    return (
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-300">
          {loadedCount > 0
            ? `Mostrando ${firstPosition}-${lastPosition} de ${totalCount}`
            : `Página ${currentPage} de ${totalPages}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={currentPage > 1 ? `/?page=${currentPage - 1}` : "/"}
            aria-disabled={currentPage === 1}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              currentPage === 1
                ? "pointer-events-none border-white/8 bg-white/5 text-slate-500"
                : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
            }`}
          >
            Anterior
          </Link>

          {visiblePages.map((page) => {
            const showEllipsis = previousPage !== 0 && page - previousPage > 1;
            previousPage = page;

            return (
              <div key={page} className="flex items-center gap-2">
                {showEllipsis ? (
                  <span className="px-1 text-sm text-slate-500">…</span>
                ) : null}
                <Link
                  href={page === 1 ? "/" : `/?page=${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    page === currentPage
                      ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-100"
                      : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
                  }`}
                >
                  {page}
                </Link>
              </div>
            );
          })}

          <Link
            href={currentPage < totalPages ? `/?page=${currentPage + 1}` : `/?page=${totalPages}`}
            aria-disabled={currentPage === totalPages}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              currentPage === totalPages
                ? "pointer-events-none border-white/8 bg-white/5 text-slate-500"
                : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(3,7,18,0.24)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-300/85">
              Photo Viewer
            </p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Archivo visual conectado a Supabase
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                El visor usa los registros de la base de datos para el bucket{" "}
                <span className="font-semibold text-white">{bucketName}</span>{" "}
                y resuelve cada imagen desde Storage sin salir de la página.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              {totalPages > 1
                ? `Página ${currentPage} de ${totalPages}`
                : `${totalCount} fotos detectadas`}
            </span>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-3xl border border-amber-300/30 bg-amber-300/8 p-5 text-sm leading-7 text-amber-50">
            Faltan datos de conexión. Necesitas definir
            `NEXT_PUBLIC_SUPABASE_URL` y una clave pública para poder leer el
            bucket.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
            {error}
          </div>
        ) : null}

        {configured && !error && photos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
            La tabla `public.fotos` está accesible, pero no hay registros con
            imágenes compatibles para este bucket.
          </div>
        ) : null}

        {photos.length > 0 ? (
          <>
            {renderPagination()}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setSelectedIndex(index)}
                  className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/65 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_18px_50px_rgba(17,24,39,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={photo.src}
                      alt={photo.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/5 to-transparent" />
                    <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                      {String(firstPosition + index).padStart(2, "0")}
                    </div>
                  </div>
                <div className="space-y-1 px-5 py-4">
                  <p className="truncate text-sm font-medium text-white">
                    {photo.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {photo.name}
                  </p>
                  {photo.groupName ? (
                    <p className="truncate text-xs text-cyan-200/90">
                      {photo.groupName}
                    </p>
                  ) : null}
                  {photo.description ? (
                    <p className="line-clamp-2 text-xs leading-6 text-slate-300">
                      {photo.description}
                    </p>
                  ) : null}
                  {buildPhotoMeta(photo) ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {buildPhotoMeta(photo)}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
            </div>
            {renderPagination()}
          </>
        ) : null}
      </div>

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar visor"
            className="absolute inset-0 cursor-default"
            onClick={closeViewer}
          />
          <div className="relative z-10 flex w-full max-w-6xl flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-slate-200">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {selectedPhoto.title}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {selectedPhoto.name}
                </p>
                {buildPhotoMeta(selectedPhoto) ? (
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {buildPhotoMeta(selectedPhoto)}
                  </p>
                ) : null}
                {selectedPhoto.groupName ? (
                  <p className="truncate text-xs text-cyan-200/90">
                    {selectedPhoto.groupName}
                  </p>
                ) : null}
                {selectedPhoto.description ? (
                  <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-300">
                    {selectedPhoto.description}
                  </p>
                ) : null}
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {selectedIndex !== null
                    ? `${firstPosition + selectedIndex} / ${totalCount}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeViewer}
                className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-100 transition hover:border-white/40 hover:bg-white/6"
              >
                Cerrar
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="relative aspect-[16/11] min-h-[55vh]">
                <Image
                  src={selectedPhoto.src}
                  alt={selectedPhoto.name}
                  fill
                  priority
                  sizes="100vw"
                  className="object-contain"
                />
              </div>

              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={showPreviousPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/60 hover:bg-slate-900/90"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    aria-label="Foto siguiente"
                    onClick={showNextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/60 hover:bg-slate-900/90"
                  >
                    Next
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

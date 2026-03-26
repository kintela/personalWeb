"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useState,
  useEffectEvent,
} from "react";

import {
  getPhotoPeopleGroupLabel,
  hasActivePhotoFilter,
  hasActivePhotoPeopleGroup,
  PHOTO_PEOPLE_GROUP_OPTIONS,
  type PhotoPeopleGroup,
} from "@/lib/photo-filters";
import { PhotoUploadPanel } from "@/components/photo-upload-panel";
import { ShareCardButton } from "@/components/share-card-button";
import type { PhotoAsset } from "@/lib/supabase/photos";

type PhotoViewerProps = {
  photos: PhotoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  loadedCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  filterValue: string;
  peopleGroup: PhotoPeopleGroup;
  initiallyUnlocked: boolean;
};

const PHOTO_VIEWER_GRID_STORAGE_KEY = "photo-viewer-compact-grid";
type PhotoGridDensity = "default" | "compact" | "dense";

function buildPhotoMeta(photo: PhotoAsset) {
  return [photo.dateLabel, photo.origin, photo.place].filter(Boolean).join(" · ");
}

function buildPhotoPeopleLabel(photo: PhotoAsset) {
  return photo.people.join(", ");
}

function buildGalleryHref(
  page: number,
  filterValue: string,
  peopleGroup: PhotoPeopleGroup,
) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (hasActivePhotoFilter(filterValue)) {
    params.set("filterValue", filterValue);
  }

  if (hasActivePhotoPeopleGroup(peopleGroup)) {
    params.set("peopleGroup", peopleGroup);
  }

  const query = params.toString();

  return query ? `/?${query}` : "/";
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

export function PhotoViewer({
  photos,
  configured,
  error,
  totalCount,
  loadedCount,
  currentPage,
  totalPages,
  pageSize,
  filterValue,
  peopleGroup,
  initiallyUnlocked,
}: PhotoViewerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filterInput, setFilterInput] = useState(filterValue);
  const [selectedPeopleGroup, setSelectedPeopleGroup] =
    useState<PhotoPeopleGroup>(peopleGroup);
  const [gridDensity, setGridDensity] = useState<PhotoGridDensity>("default");
  const visiblePages = buildVisiblePages(currentPage, totalPages);
  const firstPosition = (currentPage - 1) * pageSize + 1;
  const lastPosition =
    loadedCount === 0 ? 0 : firstPosition + loadedCount - 1;
  const hasActiveFilter = hasActivePhotoFilter(filterValue);
  const hasActivePeopleGroup = hasActivePhotoPeopleGroup(peopleGroup);

  const selectedPhoto =
    selectedIndex === null ? null : photos.at(selectedIndex) ?? null;

  const closeViewer = () => setSelectedIndex(null);

  const applyFilter = (
    nextFilterValue: string,
    nextPeopleGroup: PhotoPeopleGroup,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedFilterValue = nextFilterValue.trim();

    params.delete("page");
    params.delete("filterField");

    if (trimmedFilterValue) {
      params.set("filterValue", trimmedFilterValue);
    } else {
      params.delete("filterValue");
    }

    if (hasActivePhotoPeopleGroup(nextPeopleGroup)) {
      params.set("peopleGroup", nextPeopleGroup);
    } else {
      params.delete("peopleGroup");
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

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

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setSelectedPeopleGroup(peopleGroup);
  }, [peopleGroup]);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(
      PHOTO_VIEWER_GRID_STORAGE_KEY,
    ) as PhotoGridDensity | null;

    if (
      savedValue === "compact" ||
      savedValue === "dense" ||
      savedValue === "default"
    ) {
      setGridDensity(savedValue);
      return;
    }

    setGridDensity("default");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PHOTO_VIEWER_GRID_STORAGE_KEY,
      gridDensity,
    );
  }, [gridDensity]);

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
            href={buildGalleryHref(currentPage - 1, filterValue, peopleGroup)}
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
                  href={buildGalleryHref(page, filterValue, peopleGroup)}
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
            href={buildGalleryHref(
              currentPage < totalPages ? currentPage + 1 : totalPages,
              filterValue,
              peopleGroup,
            )}
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

  const gridClassName =
    gridDensity === "dense"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      : gridDensity === "compact"
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";
  const imageSizes =
    gridDensity === "dense"
      ? "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
      : gridDensity === "compact"
        ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw";

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
                Todos leyendas...
              </h2>
              <p className="mt-2 text-sm text-slate-300 md:text-base">
                igual hasta tu también apareces
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start">
            <PhotoUploadPanel initiallyUnlocked={initiallyUnlocked} />
            <ShareCardButton
              anchorId="fotos"
              queryKeys={["page", "filterValue", "peopleGroup"]}
              className="shrink-0"
            />
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                {totalPages > 1
                  ? `Página ${currentPage} de ${totalPages}`
                  : `${totalCount} fotos detectadas`}
              </span>
            </div>
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

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter(filterInput, selectedPeopleGroup);
            }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
              Filtro
            </h3>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="block lg:min-w-0 lg:flex-1">
                <span className="sr-only">Texto a filtrar</span>
                <input
                  type="search"
                  value={filterInput}
                  onChange={(event) => setFilterInput(event.target.value)}
                  placeholder="Ejemplo: Facebook, Keith Richards, Bilbao, 1978..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                />
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterInput("");
                    setSelectedPeopleGroup("all");
                    applyFilter("", "all");
                  }}
                  className="rounded-2xl border border-white/12 bg-black/25 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {PHOTO_PEOPLE_GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedPeopleGroup(option.value);
                    applyFilter(filterInput, option.value);
                  }}
                  aria-pressed={selectedPeopleGroup === option.value}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selectedPeopleGroup === option.value
                      ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-100"
                      : "border-white/12 bg-black/25 text-slate-100 hover:border-cyan-300/50 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-6">
                {hasActiveFilter || hasActivePeopleGroup ? (
                  <p className="text-sm text-slate-300">
                    {totalCount} resultados encontrados
                    {hasActiveFilter ? (
                      <>
                        {" "}para{" "}
                        <span className="font-medium text-cyan-100">
                          {filterValue}
                        </span>
                      </>
                    ) : null}
                    {hasActivePeopleGroup ? (
                      <>
                        {" "}en{" "}
                        <span className="font-medium text-cyan-100">
                          {getPhotoPeopleGroupLabel(peopleGroup)}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={
                    gridDensity === "compact"
                      ? "Volver al tamaño normal"
                      : "Ver 4 fotos por fila"
                  }
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
                      : "Activar vista compacta de 4 fotos por fila"}
                  </span>
                  <GridDensityIcon
                    active={gridDensity === "compact"}
                    columns={4}
                  />
                </button>

                <button
                  type="button"
                  title={
                    gridDensity === "dense"
                      ? "Volver al tamaño normal"
                      : "Ver 6 fotos por fila"
                  }
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
                      : "Activar vista densa de 6 fotos por fila"}
                  </span>
                  <GridDensityIcon
                    active={gridDensity === "dense"}
                    columns={6}
                  />
                </button>
              </div>
            </div>
          </form>
        </div>

        {configured && !error && photos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
            {hasActiveFilter || hasActivePeopleGroup
              ? "No hay fotos que coincidan con el filtro actual."
              : "La tabla `public.fotos` está accesible, pero no hay registros con imágenes compatibles para este bucket."}
          </div>
        ) : null}

        {photos.length > 0 ? (
          <>
            {renderPagination()}
            <div className={gridClassName}>
              {photos.map((photo, index) => {
                const anchorId = `foto-${photo.id}`;

                return (
                  <article
                    key={photo.id}
                    id={anchorId}
                    className="group relative scroll-mt-32 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/65 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_18px_50px_rgba(17,24,39,0.42)]"
                  >
                    <ShareCardButton
                      anchorId={anchorId}
                      sectionId="fotos"
                      queryKeys={["page", "filterValue", "peopleGroup"]}
                      className="absolute right-4 top-4 z-10"
                    />

                    <button
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-inset"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <Image
                          src={photo.src}
                          alt={photo.name}
                          fill
                          unoptimized
                          sizes={imageSizes}
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/5 to-transparent" />
                        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
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
                        {photo.people.length > 0 ? (
                          <p className="line-clamp-2 text-xs leading-6 text-slate-300">
                            {buildPhotoPeopleLabel(photo)}
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
                  </article>
                );
              })}
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
                {selectedPhoto.people.length > 0 ? (
                  <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-300">
                    {buildPhotoPeopleLabel(selectedPhoto)}
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
                  unoptimized
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

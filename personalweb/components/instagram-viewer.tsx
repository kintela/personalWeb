"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import type {
  InstagramMediaAsset,
  InstagramProfileAsset,
} from "@/lib/instagram-types";

type InstagramViewerProps = {
  profile: InstagramProfileAsset | null;
  media: InstagramMediaAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
  filterValue: string;
};

const INSTAGRAM_VIEWER_GRID_STORAGE_KEY = "instagram-viewer-grid-density";

function formatInstagramMediaType(mediaType: string) {
  switch (mediaType) {
    case "IMAGE":
      return "Foto";
    case "VIDEO":
      return "Vídeo";
    case "CAROUSEL_ALBUM":
      return "Carrusel";
    default:
      return mediaType;
  }
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("es-ES");
}

function matchesInstagramSearch(media: InstagramMediaAsset, filterValue: string) {
  const normalizedFilterValue = normalizeSearchValue(filterValue);

  if (!normalizedFilterValue) {
    return true;
  }

  const searchableText = [
    media.caption,
    formatInstagramMediaType(media.mediaType),
    media.timestampLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es-ES");

  return searchableText.includes(normalizedFilterValue);
}

export function InstagramViewer({
  profile,
  media,
  configured,
  connected,
  error,
  accountName,
  loginHref,
  callbackPath,
  filterValue,
}: InstagramViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(filterValue);
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    INSTAGRAM_VIEWER_GRID_STORAGE_KEY,
  );
  const visibleMedia = media.filter((item) =>
    matchesInstagramSearch(item, filterValue),
  );
  const hasActiveFilters = Boolean(filterValue);
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        : "grid gap-5 lg:grid-cols-2 xl:grid-cols-3";

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  function applyFilters(nextFilterValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedFilterValue = nextFilterValue.trim();

    if (normalizedFilterValue) {
      params.set("instagramFilter", normalizedFilterValue);
    } else {
      params.delete("instagramFilter");
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
    applyFilters(filterInput);
  }

  function handleReset() {
    setFilterInput("");
    applyFilters("");
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Instagram
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Fotos y publicaciones de mi cuenta
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Traídas directamente desde Instagram y listas para filtrar por
                texto, fecha o tipo de contenido.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton
              anchorId="instagram"
              queryKeys={["instagramFilter"]}
              className="shrink-0"
            />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>
                {connected ? `${media.length} publicaciones cargadas` : "Listo para conectar"}
              </span>
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="space-y-5 rounded-[2rem] border border-amber-400/25 bg-amber-400/10 p-5">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-amber-50">
                Instagram todavía no está conectado
              </h3>
              <p className="text-sm leading-7 text-amber-100/88">
                {configured
                  ? "La app ya tiene App ID, App Secret y Redirect URI. Solo falta autorizarla una vez para sacar el page access token y el identificador de tu cuenta de Instagram."
                  : "Antes de autorizar, añade INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_REDIRECT_URI en .env.local."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {configured ? (
                <Link
                  href={loginHref}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <span>Conectar Instagram</span>
                  <span>→</span>
                </Link>
              ) : null}
              <p className="text-sm text-amber-100/75">
                Callback configurada: <code>{callbackPath}</code>
              </p>
            </div>

            {error ? (
              <div className="rounded-[1.5rem] border border-rose-400/25 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        ) : error ? (
          <div className="space-y-4 rounded-[2rem] border border-rose-400/25 bg-rose-400/10 p-5">
            <p className="text-sm leading-7 text-rose-100">{error}</p>
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200/20 bg-rose-950/20 px-5 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-200/35"
            >
              Reconectar Instagram
            </Link>
          </div>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {profile?.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={`Avatar de ${accountName ?? "Instagram"}`}
                      className="h-24 w-24 rounded-[1.5rem] border border-white/10 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 text-lg font-semibold uppercase tracking-[0.22em] text-cyan-100">
                      IG
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-cyan-300/78">
                        Cuenta conectada
                      </p>
                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        {profile?.name ?? accountName ?? "Instagram"}
                      </h3>
                      {profile?.username ? (
                        <p className="text-sm text-cyan-200">
                          @{profile.username}
                        </p>
                      ) : null}
                    </div>
                    {profile?.biography ? (
                      <p className="max-w-2xl text-sm leading-7 text-slate-300/90">
                        {profile.biography}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Publicaciones cargadas
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {media.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Últimas publicaciones disponibles en la API.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Total en el perfil
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {profile?.mediaCount ?? "—"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Conteo total que devuelve Instagram para la cuenta.
                  </p>
                </div>
              </div>
            </section>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
              <form className="space-y-5" onSubmit={handleApply}>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                    Buscar
                  </p>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                    <input
                      type="search"
                      value={filterInput}
                      onChange={(event) => setFilterInput(event.target.value)}
                      placeholder="Ejemplo: Madrid, riff, festival, vídeo..."
                      className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                    />

                    <button
                      type="submit"
                      className="rounded-2xl bg-cyan-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Buscar
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

                <p className="text-sm text-slate-300">
                  {visibleMedia.length} resultados
                  {hasActiveFilters ? (
                    <>
                      {" "}
                      para{" "}
                      <span className="font-semibold text-white">
                        {filterValue}
                      </span>
                    </>
                  ) : null}
                </p>
              </form>
            </div>

            {visibleMedia.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
                {hasActiveFilters
                  ? "No hay publicaciones de Instagram que coincidan con la búsqueda actual."
                  : "Instagram está conectado, pero la API no ha devuelto publicaciones todavía."}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <GridDensityControls
                    gridDensity={gridDensity}
                    setGridDensity={setGridDensity}
                    compactTitle="Ver más publicaciones por fila"
                    denseTitle="Ver todavía más publicaciones por fila"
                  />
                </div>

                <div className={gridClassName}>
                  {visibleMedia.map((item) => {
                    const anchorId = `instagram-media-${item.id}`;

                    return (
                      <article
                        key={item.id}
                        id={anchorId}
                        className="group scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                      >
                        <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-slate-900">
                          <ShareCardButton
                            anchorId={anchorId}
                            sectionId="instagram"
                            queryKeys={["instagramFilter"]}
                            className="absolute right-4 top-4 z-10"
                          />

                          {item.displayUrl ? (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-full"
                            >
                              <img
                                src={item.displayUrl}
                                alt={
                                  item.caption
                                    ? `Publicación de Instagram: ${item.caption}`
                                    : "Publicación de Instagram"
                                }
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-5 text-center text-[0.72rem] uppercase tracking-[0.28em] text-slate-400"
                            >
                              Abrir en Instagram
                            </a>
                          )}

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent p-4">
                            <span className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white">
                              {formatInstagramMediaType(item.mediaType)}
                            </span>
                            {item.childCount > 1 ? (
                              <span className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white">
                                {item.childCount} items
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.timestampLabel ? (
                              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                                {item.timestampLabel}
                              </span>
                            ) : null}
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/18"
                            >
                              Ver en Instagram
                            </a>
                          </div>

                          <p className="text-sm leading-7 text-slate-300">
                            {item.caption ?? "Publicación sin texto."}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

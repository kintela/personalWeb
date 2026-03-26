"use client";

import Image from "next/image";

import { ShareCardButton } from "@/components/share-card-button";
import type { SpotifyPlaylistAsset } from "@/lib/spotify-types";

type SpotifyViewerProps = {
  playlists: SpotifyPlaylistAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
};

function getPlaylistCountLabel(count: number) {
  return `${count} lista${count === 1 ? "" : "s"}`;
}

export function SpotifyViewer({
  playlists,
  configured,
  connected,
  error,
  accountName,
  loginHref,
  callbackPath,
}: SpotifyViewerProps) {
  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Spotify
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Me flipan...
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton anchorId="spotify" className="shrink-0" />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span>
                {configured && connected
                  ? `${getPlaylistCountLabel(playlists.length)}${accountName ? ` de ${accountName}` : ""}`
                  : "Integración lista para conectar"}
              </span>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm leading-7 text-amber-100">
            Faltan variables de entorno de Spotify. Añade
            <span className="font-semibold text-white">
              {" "}
              `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` y
              `SPOTIFY_REDIRECT_URI`
            </span>
            .
          </div>
        ) : !connected ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-cyan-300/75">
                  Conexión
                </p>
                <h3 className="text-2xl font-semibold tracking-tight text-white">
                  Falta autorizar una vez tu cuenta
                </h3>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  La parte de código ya está preparada. Ahora necesitas sacar el
                  `refresh token` para que la web pueda leer tus playlists
                  propias.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
                  <p>
                    Redirect local que debes registrar en Spotify:
                    <span className="font-semibold text-white">
                      {" "}
                      `http://127.0.0.1:3000{callbackPath}`
                    </span>
                  </p>
                  <p>
                    Redirect de producción:
                    <span className="font-semibold text-white">
                      {" "}
                      `https://www.kintela.es{callbackPath}`
                    </span>
                  </p>
                  <p>
                    Spotify ya no acepta `localhost` como redirect URI en este
                    caso; usa `127.0.0.1`.
                  </p>
                </div>

                <a
                  href={loginHref}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 text-sm font-medium uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-300/18 hover:text-white"
                >
                  Conectar Spotify
                </a>
              </div>
            </div>
          </div>
        ) : error && playlists.length === 0 ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            La conexión con Spotify está hecha, pero no he encontrado playlists
            propias para mostrar.
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
              {playlists.map((playlist) => {
                const anchorId = `spotify-playlist-${playlist.id}`;

                return (
                  <article
                    key={playlist.id}
                    id={anchorId}
                    className="group relative flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                  >
                    <ShareCardButton
                      anchorId={anchorId}
                      sectionId="spotify"
                      className="absolute right-4 top-4 z-10"
                    />

                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                      {playlist.imageUrl ? (
                        <Image
                          src={playlist.imageUrl}
                          alt={`Portada de ${playlist.name}`}
                          fill
                          unoptimized
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 1280px) 100vw, (max-width: 1536px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-8 text-center text-sm uppercase tracking-[0.3em] text-slate-400">
                          Spotify
                        </div>
                      )}
                    </div>

                      <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-emerald-100">
                            {playlist.visibilityLabel}
                          </span>
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                            {playlist.trackCount} temas
                          </span>
                        </div>

                        <a
                          href={playlist.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/65 hover:bg-emerald-300/18 hover:text-white"
                        >
                          Escuchar
                        </a>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold leading-tight text-white">
                          {playlist.name}
                        </h3>
                        <p className="text-sm leading-7 text-slate-300">
                          {playlist.description ??
                            "Sin descripción visible en Spotify."}
                        </p>
                      </div>

                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        {playlist.ownerName}
                      </p>

                      <div className="mt-auto pt-1" />
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

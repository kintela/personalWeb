import Image from "next/image";
import type { ConcertAsset } from "@/lib/supabase/concerts";

type ConcertsViewerProps = {
  concerts: ConcertAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

function buildConcertLocation(concert: ConcertAsset) {
  return [concert.city, concert.venue].filter(Boolean).join(" · ");
}

export function ConcertsViewer({
  concerts,
  configured,
  error,
  totalCount,
}: ConcertsViewerProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(3,7,18,0.24)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-300/85">
              Conciertos
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Bolos a los que me he escapado...
              </h2>
              <p className="text-sm text-slate-300 md:text-base">
                Fechas, salas, ciudades y unos cuantos vídeos para recordar la
                jugada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{totalCount} conciertos cargados</span>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-3xl border border-amber-300/30 bg-amber-300/8 p-5 text-sm leading-7 text-amber-50">
            Faltan datos de conexión. Necesitas definir
            `NEXT_PUBLIC_SUPABASE_URL` y una clave pública para poder leer los
            conciertos.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
            {error}
          </div>
        ) : null}

        {configured && !error && concerts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
            La tabla `public.conciertos` está accesible, pero todavía no hay
            conciertos cargados.
          </div>
        ) : null}

        {concerts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {concerts.map((concert) => {
              const location = buildConcertLocation(concert);

              return (
                <article
                  key={concert.id}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 shadow-[0_18px_50px_rgba(17,24,39,0.28)]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/80">
                          {concert.dateLabel}
                        </p>
                        <h3 className="text-xl font-semibold text-white">
                          {concert.groupName ?? "Grupo sin vincular"}
                        </h3>
                        {location ? (
                          <p className="text-sm text-slate-300">{location}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {concert.festival ? (
                          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                            Festival
                          </span>
                        ) : null}
                        {concert.hasPhotos ? (
                          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                            Fotos
                          </span>
                        ) : null}
                        {concert.videos.length > 0 ? (
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                            {concert.videos.length} vídeos
                          </span>
                        ) : null}
                        {concert.instagramVideos.length > 0 ? (
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                            {concert.instagramVideos.length} reels
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {concert.description ? (
                      <p className="line-clamp-3 text-sm leading-7 text-slate-300">
                        {concert.description}
                      </p>
                    ) : concert.review ? (
                      <p className="line-clamp-3 text-sm leading-7 text-slate-300">
                        {concert.review}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {concert.videos.slice(0, 3).map((videoUrl, index) => (
                        <a
                          key={videoUrl}
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                        >
                          Video {index + 1}
                        </a>
                      ))}
                      {concert.instagramVideos
                        .slice(0, 2)
                        .map((videoUrl, index) => (
                          <a
                            key={videoUrl}
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
                          >
                            Instagram {index + 1}
                          </a>
                        ))}
                    </div>

                    {concert.ticketImageSrc || concert.posterImageSrc ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {concert.ticketImageSrc ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Entrada
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                              <Image
                                src={concert.ticketImageSrc}
                                alt={`${concert.groupName ?? "Concierto"} entrada`}
                                width={1200}
                                height={700}
                                unoptimized
                                className="h-auto w-full object-contain"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                            </div>
                          </div>
                        ) : null}

                        {concert.posterImageSrc ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Cartel
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                              <Image
                                src={concert.posterImageSrc}
                                alt={`${concert.groupName ?? "Concierto"} cartel`}
                                width={1200}
                                height={700}
                                unoptimized
                                className="h-auto w-full object-contain"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : concert.ticket || concert.poster ? (
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {[concert.ticket, concert.poster].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import Image from "next/image";

import { ShareCardButton } from "@/components/share-card-button";
import type { ViniloAsset } from "@/lib/supabase/vinilos";

type VinilosViewerProps = {
  vinilos: ViniloAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

export function VinilosViewer({
  vinilos,
  configured,
  error,
  totalCount,
}: VinilosViewerProps) {
  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Vinilos
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Portadas grandes, aguja fina...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Una balda corta, pero con discos que da gusto tener delante y
                poner a girar.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>{totalCount} vinilos cargados</span>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar los
            vinilos.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : vinilos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay vinilos cargados todavía.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {vinilos.map((vinilo) => {
              const anchorId = `vinilo-${vinilo.id}`;

              return (
                <article
                  key={vinilo.id}
                  id={anchorId}
                  className="group scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                >
                  <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-slate-900">
                    <ShareCardButton
                      anchorId={anchorId}
                      sectionId="vinilos"
                      className="absolute right-4 top-4 z-10"
                    />

                    {vinilo.coverSrc ? (
                      <Image
                        src={vinilo.coverSrc}
                        alt={`Carátula de ${vinilo.title}`}
                        fill
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        sizes="(min-width: 1280px) 360px, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-4 text-center text-[0.72rem] uppercase tracking-[0.28em] text-slate-400">
                        Sin carátula
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      {vinilo.groupName ? (
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cyan-100">
                          {vinilo.groupName}
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                          Sin grupo
                        </span>
                      )}

                      {Number.isInteger(vinilo.year) ? (
                        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                          {vinilo.year}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold leading-tight text-white">
                        {vinilo.title}
                      </h3>
                      <p className="text-sm leading-6 text-slate-300">
                        {vinilo.groupName ?? "Grupo sin asignar"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

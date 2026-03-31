import Link from "next/link";
import { SITE_SECTIONS } from "@/lib/site-sections";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)] lg:items-end">
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Personal Web
              </p>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Cositas que me molan, ahora en bloques separados.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-200/88 md:text-lg">
                  La portada ya no carga todas las galerías, discos, vídeos y
                  playlists de golpe. Aquí solo ves qué ofrece cada bloque y
                  entras al que te interese.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-cyan-300/18 bg-slate-950/50 p-5 text-sm leading-6 text-slate-300 shadow-[0_18px_60px_rgba(2,6,23,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                Nuevo flujo
              </p>
              <p className="mt-3">
                Cada sección se abre en su propia página para reducir la carga
                inicial y aislar mejor búsquedas, filtros y renderizados.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-300/75">
              Secciones
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Elige por dónde entrar
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SITE_SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group flex h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-300/10"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-cyan-300/78">
                      {section.eyebrow}
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-300/88">
                    {section.description}
                  </p>
                  <p className="text-sm leading-6 text-slate-400">
                    {section.summary}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm font-medium text-cyan-200">
                  <span>Abrir sección</span>
                  <span className="text-lg transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

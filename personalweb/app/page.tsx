import Link from "next/link";
import { SITE_SECTIONS } from "@/lib/site-sections";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-6 py-8 sm:px-10 lg:gap-24 lg:px-12 lg:py-12">
        <section className="relative overflow-hidden rounded-[2.9rem] border border-white/10 bg-white/6 px-6 py-10 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-14">
          <div className="absolute -left-12 top-0 h-48 w-48 rounded-full bg-cyan-300/16 blur-3xl" />
          <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.8fr)] lg:items-end">
            <div className="space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Personal Web
              </p>
              <div className="space-y-5">
                <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
                  Una landing larga para entrar por el sitio que te apetezca.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-200/88 md:text-lg">
                  La portada ya no intenta enseñarlo todo a la vez. Ahora baja
                  como una secuencia de secciones: texto, una pieza visual al
                  lado y un acceso directo a cada bloque.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={SITE_SECTIONS[0]?.href ?? "/fotos"}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/14 px-5 py-3 text-sm font-medium text-cyan-50 transition hover:border-cyan-200/45 hover:bg-cyan-300/20"
                >
                  <span>Empezar a bajar</span>
                  <span>↓</span>
                </Link>
                <p className="self-center text-sm text-slate-400">
                  Cada bloque abre su propia página y carga solo lo suyo.
                </p>
              </div>
            </div>

            <div className="relative rounded-[2.4rem] border border-white/10 bg-slate-950/50 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.24)]">
              <div className="grid gap-3 sm:grid-cols-2">
                {SITE_SECTIONS.slice(0, 4).map((section) => (
                  <div
                    key={section.href}
                    className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4"
                  >
                    <p className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-cyan-300/76">
                      {section.eyebrow}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {section.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300/84">
                      {section.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          {SITE_SECTIONS.map((section, index) => (
            <article
              key={section.href}
              className="border-t border-white/10 py-10 first:border-t-0 first:pt-0 lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
                <div className={index % 2 === 0 ? "" : "lg:order-2"}>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-[0.34em] text-cyan-300/74">
                        {section.eyebrow}
                      </p>
                      <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                        {section.title}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-2xl text-base leading-7 text-slate-200/88 md:text-lg">
                        {section.description}
                      </p>
                      <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                        {section.summary}
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {section.details.map((detail) => (
                        <div
                          key={detail}
                          className="flex gap-3 rounded-[1.5rem] border border-white/8 bg-slate-950/36 px-4 py-3"
                        >
                          <span className="pt-1 text-cyan-300">•</span>
                          <p className="text-sm leading-6 text-slate-300/88">
                            {detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <Link
                        href={section.href}
                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/12"
                      >
                        <span>Abrir {section.title}</span>
                        <span>→</span>
                      </Link>
                      <p className="text-sm text-slate-400">
                        Se abre como página independiente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={index % 2 === 0 ? "" : "lg:order-1"}>
                  <div
                    className={`relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-gradient-to-br p-4 shadow-[0_24px_80px_rgba(2,6,23,0.24)] ${section.visual.gradientClass}`}
                  >
                    <div
                      className={`absolute -right-12 top-0 h-40 w-40 rounded-full blur-3xl ${section.visual.glowPrimaryClass}`}
                    />
                    <div
                      className={`absolute -left-10 bottom-0 h-36 w-36 rounded-full blur-3xl ${section.visual.glowSecondaryClass}`}
                    />

                    <div className="relative rounded-[2rem] border border-white/12 bg-slate-950/58 p-5 backdrop-blur sm:p-7">
                      <div className="flex min-h-[22rem] flex-col justify-between gap-8">
                        <div className="space-y-5">
                          <div
                            className={`inline-flex rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${section.visual.badgeClass}`}
                          >
                            {section.visual.kicker}
                          </div>
                          <div className="space-y-3">
                            <h3 className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
                              {section.visual.title}
                            </h3>
                            <p className="max-w-md text-sm leading-6 text-slate-200/82">
                              {section.visual.caption}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          {section.visual.cards.map((card) => (
                            <div
                              key={`${section.sectionId}-${card.label}`}
                              className="rounded-[1.5rem] border border-white/10 bg-white/7 px-4 py-4"
                            >
                              <p className="text-[0.64rem] font-medium uppercase tracking-[0.26em] text-slate-300/72">
                                {card.label}
                              </p>
                              <p
                                className={`mt-2 text-lg font-semibold ${section.visual.valueClass}`}
                              >
                                {card.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

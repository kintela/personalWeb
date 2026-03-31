import type { ReactNode } from "react";
import Link from "next/link";
import { DeepLinkFocus } from "@/components/deep-link-focus";
import { getSiteSection, SITE_SECTIONS } from "@/lib/site-sections";

type SectionPageShellProps = {
  currentHref: string;
  children: ReactNode;
};

export function SectionPageShell({
  currentHref,
  children,
}: SectionPageShellProps) {
  const currentSection = getSiteSection(currentHref);

  if (!currentSection) {
    throw new Error(`Seccion no registrada: ${currentHref}`);
  }

  const relatedSections = SITE_SECTIONS.filter(
    (section) => section.href !== currentHref,
  );

  return (
    <main className="min-h-screen">
      <DeepLinkFocus />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100"
              >
                <span>←</span>
                <span>Volver al inicio</span>
              </Link>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-300/72">
                Página independiente
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                {currentSection.eyebrow}
              </p>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  {currentSection.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-200/88 md:text-lg">
                  {currentSection.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div id={currentSection.sectionId} className="scroll-mt-32">
          {children}
        </div>

        <section className="space-y-4 rounded-[2.3rem] border border-white/10 bg-slate-950/45 px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300/74">
              Otras rutas
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Explorar otro bloque
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {relatedSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-[1.6rem] border border-white/10 bg-white/6 px-4 py-4 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
              >
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-cyan-300/78">
                  {section.eyebrow}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {section.title}
                </p>
                {section.summary ? (
                  <p className="mt-2 text-sm leading-6 text-slate-300/84">
                    {section.summary}
                  </p>
                ) : null}
                <p className="mt-4 text-sm font-medium text-cyan-200">
                  Abrir
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

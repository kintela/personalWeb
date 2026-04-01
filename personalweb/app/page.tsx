import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/page-metadata";
import { SITE_SECTIONS } from "@/lib/site-sections";

export const metadata: Metadata = buildPageMetadata("/");

const LANDING_SECTION_ORDER = ["/spotify", "/mtv"] as const;
const LANDING_SECTION_ORDER_SET = new Set<string>(LANDING_SECTION_ORDER);
const LANDING_IMAGE_BUCKET = "landing";

function getLandingAssetPublicUrl(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = path
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(LANDING_IMAGE_BUCKET)}/${encodedPath}`;
}

export default function Home() {
  const landingSections = [
    ...LANDING_SECTION_ORDER.flatMap((href) =>
      SITE_SECTIONS.filter((section) => section.href === href),
    ),
    ...SITE_SECTIONS.filter(
      (section) => !LANDING_SECTION_ORDER_SET.has(section.href),
    ),
  ];
  const cdsLandingImageSrc = getLandingAssetPublicUrl("cds.jpg");
  const conciertosLandingImageSrc = getLandingAssetPublicUrl("conciertos.jpg");
  const fotosLandingImageSrc = getLandingAssetPublicUrl("fotos.jpg");
  const guitarraLandingImageSrc = getLandingAssetPublicUrl("guitarra.jpg");
  const historiaLandingImageSrc = getLandingAssetPublicUrl("historia.jpeg");
  const librosLandingImageSrc = getLandingAssetPublicUrl("libros.jpg");
  const videosLandingImageSrc = getLandingAssetPublicUrl("videos.jpg");
  const vinilosLandingImageSrc = getLandingAssetPublicUrl("vinilos.jpg");
  const spotifyLandingImageSrc = getLandingAssetPublicUrl("spotify.jpg");
  const mtvLandingImageSrc = getLandingAssetPublicUrl("mtv.jpg");

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-6 py-8 sm:px-10 lg:gap-24 lg:px-12 lg:py-12">
        <section className="relative overflow-hidden rounded-[2.9rem] border border-white/10 bg-white/6 px-6 py-10 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-14">
          <div className="absolute -left-12 top-0 h-48 w-48 rounded-full bg-cyan-300/16 blur-3xl" />
          <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative flex min-h-[28rem] flex-col justify-between gap-10 lg:min-h-[34rem]">
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Personal Web
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
                Sumergete en mi universo...
              </h1>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-cyan-300/78">
                  Menú principal
                </p>
                <p className="text-xs text-slate-400">
                  Abre cualquier sección
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {SITE_SECTIONS.map((section) => (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="group min-h-[9.75rem] rounded-[1.4rem] border border-white/10 bg-slate-950/42 p-4 shadow-[0_16px_40px_rgba(2,6,23,0.18)] transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                  >
                    <p className="text-[0.62rem] font-medium uppercase tracking-[0.26em] text-cyan-300/76">
                      {section.eyebrow}
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className="text-base font-semibold text-white">
                        {section.title}
                      </p>
                      <span className="text-sm text-cyan-200 transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                    {section.summary ? (
                      <p className="mt-2 text-xs leading-5 text-slate-300/80">
                        {section.summary}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          {landingSections.map((section, index) => (
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
                      {section.summary ? (
                        <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                          {section.summary}
                        </p>
                      ) : null}
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
                            {section.visual.caption ? (
                              <p className="max-w-md text-sm leading-6 text-slate-200/82">
                                {section.visual.caption}
                              </p>
                            ) : null}
                          </div>
                          {section.href === "/spotify" && spotifyLandingImageSrc ? (
                            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                              <img
                                src={spotifyLandingImageSrc}
                                alt="Vista de la sección de Spotify en la landing"
                                className="h-52 w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : section.href === "/vinilos" && vinilosLandingImageSrc ? (
                            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                              <img
                                src={vinilosLandingImageSrc}
                                alt="Vista de la sección de Vinilos en la landing"
                                className="h-52 w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                        </div>

                        {section.href === "/cds" && cdsLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={cdsLandingImageSrc}
                              alt="Vista de la sección de CDs en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/mtv" && mtvLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={mtvLandingImageSrc}
                              alt="Vista de la sección MTV en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/libros" && librosLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={librosLandingImageSrc}
                              alt="Vista de la sección de Libros en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/conciertos" &&
                          conciertosLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={conciertosLandingImageSrc}
                              alt="Vista de la sección de Conciertos en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/fotos" && fotosLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={fotosLandingImageSrc}
                              alt="Vista de la sección de Fotos en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/guitarra" &&
                          guitarraLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={guitarraLandingImageSrc}
                              alt="Vista de la sección de Guitarra en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/videos" && videosLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={videosLandingImageSrc}
                              alt="Vista de la sección de Videos en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/historia" &&
                          historiaLandingImageSrc ? (
                          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6">
                            <img
                              src={historiaLandingImageSrc}
                              alt="Vista de la sección de Historia en la landing"
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : section.href === "/spotify" ||
                          section.href === "/fotos" ||
                          section.href === "/conciertos" ||
                          section.href === "/guitarra" ||
                          section.href === "/videos" ||
                          section.href === "/vinilos" ||
                          section.href === "/historia" ? null : (
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
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <footer className="border-t border-white/10 py-8 text-center">
          <a
            href="mailto:info@kintela.es"
            className="text-sm text-slate-300 transition hover:text-white"
          >
            info@kintela.es
          </a>
        </footer>
      </div>
    </main>
  );
}

import Image from "next/image";

import type { BookAsset } from "@/lib/supabase/books";

type BooksViewerProps = {
  books: BookAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

function buildBookMeta(book: BookAsset) {
  return [book.author, book.protagonist && `Sobre ${book.protagonist}`]
    .filter(Boolean)
    .join(" · ");
}

function buildBookDetails(book: BookAsset) {
  return [
    book.category,
    book.isbn ? `ISBN ${book.isbn}` : null,
    book.legalDeposit ? `DL ${book.legalDeposit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function BooksViewer({
  books,
  configured,
  error,
  totalCount,
}: BooksViewerProps) {
  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Libros
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Lecturas con música dentro...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Biografías, análisis, cómics y otras historias para seguir
                tirando del hilo.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>{totalCount} libros cargados</span>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar los
            libros.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay libros cargados todavía.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {books.map((book) => {
              const meta = buildBookMeta(book);
              const details = buildBookDetails(book);

              return (
                <article
                  key={book.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                    {book.coverSrc ? (
                      <Image
                        src={book.coverSrc}
                        alt={`Carátula de ${book.title}`}
                        fill
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-8 text-center text-sm uppercase tracking-[0.3em] text-slate-400">
                        Sin carátula
                      </div>
                    )}

                    {book.category ? (
                      <div className="absolute left-4 top-4">
                        <span className="rounded-full border border-cyan-300/35 bg-slate-950/75 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-cyan-200 backdrop-blur">
                          {book.category}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold leading-tight text-white">
                        {book.title}
                      </h3>

                      {meta ? (
                        <p className="text-sm leading-6 text-slate-300">{meta}</p>
                      ) : null}

                      {details ? (
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {details}
                        </p>
                      ) : null}
                    </div>

                    {book.synopsis ? (
                      <p
                        className="text-sm leading-7 text-slate-300"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 5,
                          overflow: "hidden",
                        }}
                      >
                        {book.synopsis}
                      </p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                      <span className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                        {book.publisher ?? "Sin editorial"}
                      </span>

                      {book.link ? (
                        <a
                          href={book.link}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/18 hover:text-white"
                        >
                          Ver ficha
                        </a>
                      ) : null}
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

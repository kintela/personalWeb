"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { ShareCardButton } from "@/components/share-card-button";
import type { BookAsset } from "@/lib/supabase/books";

type BooksViewerProps = {
  books: BookAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  categoryValue: string;
  protagonistValue: string;
  categoryOptions: string[];
  protagonistOptions: string[];
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
  filterValue,
  categoryValue,
  protagonistValue,
  categoryOptions,
  protagonistOptions,
}: BooksViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(filterValue);
  const [selectedCategory, setSelectedCategory] = useState(categoryValue);
  const [selectedProtagonist, setSelectedProtagonist] =
    useState(protagonistValue);
  const hasActiveFilters = Boolean(
    filterValue || categoryValue || protagonistValue,
  );

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setSelectedCategory(categoryValue);
  }, [categoryValue]);

  useEffect(() => {
    setSelectedProtagonist(protagonistValue);
  }, [protagonistValue]);

  function applyFilters({
    nextFilterValue,
    nextCategoryValue,
    nextProtagonistValue,
  }: {
    nextFilterValue: string;
    nextCategoryValue: string;
    nextProtagonistValue: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedFilterValue = nextFilterValue.trim();
    const normalizedCategoryValue = nextCategoryValue.trim();
    const normalizedProtagonistValue = nextProtagonistValue.trim();

    if (normalizedFilterValue) {
      params.set("bookFilter", normalizedFilterValue);
    } else {
      params.delete("bookFilter");
    }

    if (normalizedCategoryValue) {
      params.set("bookCategory", normalizedCategoryValue);
    } else {
      params.delete("bookCategory");
    }

    if (normalizedProtagonistValue) {
      params.set("bookProtagonist", normalizedProtagonistValue);
    } else {
      params.delete("bookProtagonist");
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
    applyFilters({
      nextFilterValue: filterInput,
      nextCategoryValue: selectedCategory,
      nextProtagonistValue: selectedProtagonist,
    });
  }

  function handleReset() {
    setFilterInput("");
    setSelectedCategory("");
    setSelectedProtagonist("");
    applyFilters({
      nextFilterValue: "",
      nextCategoryValue: "",
      nextProtagonistValue: "",
    });
  }

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

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
          <form className="space-y-5" onSubmit={handleApply}>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                Filtro
              </p>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_280px_auto_auto] xl:items-center">
                <input
                  type="search"
                  value={filterInput}
                  onChange={(event) => setFilterInput(event.target.value)}
                  placeholder="Ejemplo: Bowie, Biografía, Liburuak, ISBN..."
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                />

                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todas las categorías</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedProtagonist}
                  onChange={(event) =>
                    setSelectedProtagonist(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todos los protagonistas</option>
                  {protagonistOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Aplicar
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

            {hasActiveFilters ? (
              <p className="text-sm text-slate-300">
                {totalCount} libros encontrados
                {filterValue ? (
                  <>
                    {" "}
                    para <span className="font-semibold text-white">{filterValue}</span>
                  </>
                ) : null}
                {categoryValue ? (
                  <>
                    {" "}
                    en{" "}
                    <span className="font-semibold text-white">{categoryValue}</span>
                  </>
                ) : null}
                {protagonistValue ? (
                  <>
                    {" "}
                    sobre{" "}
                    <span className="font-semibold text-white">
                      {protagonistValue}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
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
          <div className="grid gap-5 lg:grid-cols-2">
            {books.map((book) => {
              const meta = buildBookMeta(book);
              const details = buildBookDetails(book);
              const anchorId = `libro-${book.id}`;

              return (
                <article
                  key={book.id}
                  id={anchorId}
                  className="group relative grid h-full scroll-mt-32 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr_auto] gap-x-4 gap-y-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                >
                  <ShareCardButton
                    anchorId={anchorId}
                    sectionId="libros"
                    queryKeys={["bookFilter", "bookCategory", "bookProtagonist"]}
                    className="absolute right-4 top-4 z-10"
                  />

                  <div className="w-24 shrink-0 self-start overflow-hidden rounded-[1.2rem] border border-white/10 bg-slate-900/85 p-1.5 sm:w-28">
                    {book.coverSrc ? (
                      <Image
                        src={book.coverSrc}
                        alt={`Carátula de ${book.title}`}
                        width={280}
                        height={400}
                        unoptimized
                        className="h-auto w-full rounded-[0.9rem] object-contain transition duration-500 group-hover:scale-[1.03]"
                        sizes="112px"
                      />
                    ) : (
                      <div className="flex min-h-40 items-center justify-center rounded-[0.9rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-3 text-center text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
                        Sin carátula
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2 pr-12">
                    {book.category ? (
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-cyan-200">
                        {book.category}
                      </p>
                    ) : null}

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
                      className="col-span-full min-w-0 text-sm leading-7 text-slate-300"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 4,
                        overflow: "hidden",
                      }}
                    >
                      {book.synopsis}
                    </p>
                  ) : null}

                  <div className="col-span-full flex items-center justify-between gap-3 pt-1">
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
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

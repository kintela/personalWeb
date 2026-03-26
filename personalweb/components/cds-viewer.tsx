"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import type { CdAsset } from "@/lib/supabase/cds";

type CdsViewerProps = {
  cds: CdAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  groupValue: string;
  yearValue: string;
  spotifyValue: string;
  groupOptions: string[];
  yearOptions: string[];
};

const CDS_VIEWER_GRID_STORAGE_KEY = "cds-viewer-grid-density";

function buildCdStatusLabel(cd: CdAsset) {
  return [
    Number.isInteger(cd.year) ? String(cd.year) : null,
    cd.inSpotify === true
      ? "En Spotify"
      : cd.inSpotify === false
        ? "Fuera de Spotify"
        : null,
    cd.signed === true ? "Firmado" : cd.signed === false ? "Sin firmar" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getBooleanFilterLabel(
  value: string,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (value === "si") {
    return positiveLabel;
  }

  if (value === "no") {
    return negativeLabel;
  }

  return null;
}

export function CdsViewer({
  cds,
  configured,
  error,
  totalCount,
  filterValue,
  groupValue,
  yearValue,
  spotifyValue,
  groupOptions,
  yearOptions,
}: CdsViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterInput, setFilterInput] = useState(filterValue);
  const [selectedGroup, setSelectedGroup] = useState(groupValue);
  const [selectedYear, setSelectedYear] = useState(yearValue);
  const [selectedSpotify, setSelectedSpotify] = useState(spotifyValue);
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    CDS_VIEWER_GRID_STORAGE_KEY,
  );
  const hasActiveFilters = Boolean(filterValue || groupValue || yearValue || spotifyValue);
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : gridDensity === "compact"
        ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        : "grid gap-5 lg:grid-cols-2 xl:grid-cols-3";

  useEffect(() => {
    setFilterInput(filterValue);
  }, [filterValue]);

  useEffect(() => {
    setSelectedGroup(groupValue);
  }, [groupValue]);

  useEffect(() => {
    setSelectedYear(yearValue);
  }, [yearValue]);

  useEffect(() => {
    setSelectedSpotify(spotifyValue);
  }, [spotifyValue]);

  function applyFilters({
    nextFilterValue,
    nextGroupValue,
    nextYearValue,
    nextSpotifyValue,
  }: {
    nextFilterValue: string;
    nextGroupValue: string;
    nextYearValue: string;
    nextSpotifyValue: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedFilterValue = nextFilterValue.trim();
    const normalizedGroupValue = nextGroupValue.trim();
    const normalizedYearValue = nextYearValue.trim();
    const normalizedSpotifyValue = nextSpotifyValue.trim();

    if (normalizedFilterValue) {
      params.set("cdFilter", normalizedFilterValue);
    } else {
      params.delete("cdFilter");
    }

    if (normalizedGroupValue) {
      params.set("cdGroup", normalizedGroupValue);
    } else {
      params.delete("cdGroup");
    }

    if (normalizedYearValue) {
      params.set("cdYear", normalizedYearValue);
    } else {
      params.delete("cdYear");
    }

    if (normalizedSpotifyValue) {
      params.set("cdSpotify", normalizedSpotifyValue);
    } else {
      params.delete("cdSpotify");
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
      nextGroupValue: selectedGroup,
      nextYearValue: selectedYear,
      nextSpotifyValue: selectedSpotify,
    });
  }

  function handleReset() {
    setFilterInput("");
    setSelectedGroup("");
    setSelectedYear("");
    setSelectedSpotify("");
    applyFilters({
      nextFilterValue: "",
      nextGroupValue: "",
      nextYearValue: "",
      nextSpotifyValue: "",
    });
  }

  const spotifyLabel = getBooleanFilterLabel(
    spotifyValue,
    "En Spotify",
    "Fuera de Spotify",
  );

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              CDs
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Discos que siguen conmigo...
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Una discoteca personal para rebuscar por grupo, año, firma o si
                siguen vivos en Spotify.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton
              anchorId="cds"
              queryKeys={["cdFilter", "cdGroup", "cdYear", "cdSpotify"]}
              className="shrink-0"
            />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>{totalCount} CDs cargados</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5">
          <form className="space-y-5" onSubmit={handleApply}>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-slate-300">
                Filtro
              </p>
              <input
                type="search"
                value={filterInput}
                onChange={(event) => setFilterInput(event.target.value)}
                placeholder="Buscar por disco, grupo, año, etiqueta..."
                className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
              />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_170px_170px_auto_auto] xl:items-center">
                <select
                  value={selectedGroup}
                  onChange={(event) => setSelectedGroup(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todos los grupos</option>
                  {groupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todos los años</option>
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSpotify}
                  onChange={(event) => setSelectedSpotify(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#060b1d] px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
                >
                  <option value="">Todo Spotify</option>
                  <option value="si">En Spotify</option>
                  <option value="no">Fuera de Spotify</option>
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
                {totalCount} CDs encontrados
                {filterValue ? (
                  <>
                    {" "}
                    para <span className="font-semibold text-white">{filterValue}</span>
                  </>
                ) : null}
                {groupValue ? (
                  <>
                    {" "}
                    de <span className="font-semibold text-white">{groupValue}</span>
                  </>
                ) : null}
                {yearValue ? (
                  <>
                    {" "}
                    en <span className="font-semibold text-white">{yearValue}</span>
                  </>
                ) : null}
                {spotifyLabel ? (
                  <>
                    {" "}
                    con <span className="font-semibold text-white">{spotifyLabel}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar los CDs.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : cds.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay CDs cargados todavía.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <GridDensityControls
                gridDensity={gridDensity}
                setGridDensity={setGridDensity}
                compactTitle="Activar vista compacta de CDs"
                denseTitle="Activar vista densa de CDs"
              />
            </div>

            <div className={gridClassName}>
              {cds.map((cd) => {
                const statusLabel = buildCdStatusLabel(cd);
                const anchorId = `cd-${cd.id}`;

                return (
                  <article
                    key={cd.id}
                    id={anchorId}
                    className="group relative flex h-full scroll-mt-32 flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                  >
                    <ShareCardButton
                      anchorId={anchorId}
                      sectionId="cds"
                      queryKeys={["cdFilter", "cdGroup", "cdYear", "cdSpotify"]}
                      className="absolute right-4 top-4 z-10"
                    />

                    <div className="flex flex-wrap gap-2 pr-12">
                      {cd.groupName ? (
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-cyan-100">
                          {cd.groupName}
                        </span>
                      ) : null}
                      {Number.isInteger(cd.year) ? (
                        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-200">
                          {cd.year}
                        </span>
                      ) : null}
                      {cd.signed === true ? (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-emerald-100">
                          Firmado
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold leading-tight text-white">
                        {cd.title}
                      </h3>
                      <p className="text-sm leading-6 text-slate-300">
                        {cd.groupName || "Grupo sin asignar"}
                      </p>
                      {statusLabel ? (
                        <p className="text-sm leading-6 text-slate-400">
                          {statusLabel}
                        </p>
                      ) : null}
                    </div>

                    {cd.labelId !== null && cd.labelId > 0 ? (
                      <p className="mt-auto text-xs uppercase tracking-[0.22em] text-slate-500">
                        Etiqueta #{cd.labelId}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { DiscosYearObservationPanel } from "@/components/discos-year-observation-panel";
import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import type { DiscoAsset } from "@/lib/supabase/discos";

type DiscosViewerProps = {
  discos: DiscoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  yearObservations: Record<string, string>;
  adminConfigured: boolean;
  initiallyAdminUnlocked: boolean;
};

type YearSection = {
  key: string;
  label: string;
  discos: DiscoAsset[];
  observation: string | null;
};

const DISCOS_VIEWER_GRID_STORAGE_KEY = "discos-viewer-grid-density";

function buildYearSections(
  discos: DiscoAsset[],
  yearObservations: Record<string, string>,
): YearSection[] {
  const sections = new Map<string, YearSection>();

  for (const disco of discos) {
    const sectionKey = Number.isInteger(disco.year)
      ? String(disco.year)
      : "sin-ano";
    const existingSection = sections.get(sectionKey);

    if (existingSection) {
      existingSection.discos.push(disco);
      continue;
    }

    sections.set(sectionKey, {
      key: sectionKey,
      label: Number.isInteger(disco.year) ? String(disco.year) : "Sin año",
      discos: [disco],
      observation: yearObservations[sectionKey] ?? null,
    });
  }

  return [...sections.values()];
}

function buildNextYearObservations(
  currentYearObservations: Record<string, string>,
  yearKey: string,
  observationValue: string,
) {
  const trimmedObservation = observationValue.trim();
  const nextYearObservations = { ...currentYearObservations };

  if (trimmedObservation) {
    nextYearObservations[yearKey] = trimmedObservation;
    return nextYearObservations;
  }

  delete nextYearObservations[yearKey];
  return nextYearObservations;
}

export function DiscosViewer({
  discos,
  configured,
  error,
  totalCount,
  yearObservations,
  adminConfigured,
  initiallyAdminUnlocked,
}: DiscosViewerProps) {
  const [gridDensity, setGridDensity] = usePersistedGridDensity(
    DISCOS_VIEWER_GRID_STORAGE_KEY,
  );
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(initiallyAdminUnlocked);
  const [currentYearObservations, setCurrentYearObservations] =
    useState(yearObservations);
  const [editingYearKey, setEditingYearKey] = useState("");
  const [editingObservation, setEditingObservation] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editFeedbackYearKey, setEditFeedbackYearKey] = useState("");

  useEffect(() => {
    setIsAdminUnlocked(initiallyAdminUnlocked);
  }, [initiallyAdminUnlocked]);

  useEffect(() => {
    setCurrentYearObservations(yearObservations);
  }, [yearObservations]);

  useEffect(() => {
    if (!isAdminUnlocked) {
      setEditingYearKey("");
      setEditingObservation("");
      setEditError("");
      setEditSuccess("");
      setEditFeedbackYearKey("");
    }
  }, [isAdminUnlocked]);

  const yearSections = buildYearSections(discos, currentYearObservations);
  const editableYears = yearSections
    .filter((section) => section.key !== "sin-ano")
    .map((section) => section.key);
  const visibleGroupCount = new Set(
    discos.map((disco) => disco.groupName).filter(Boolean),
  ).size;
  const visibleYearCount = yearSections.filter(
    (section) => section.key !== "sin-ano",
  ).length;
  const gridClassName =
    gridDensity === "dense"
      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : gridDensity === "compact"
      ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";

  async function handleInlineObservationSave(yearKey: string) {
    setIsSavingEdit(true);
    setEditError("");
    setEditSuccess("");

    try {
      const response = await fetch("/api/discos/year-observations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          entries: [
            {
              yearPublicacion: Number(yearKey),
              observaciones: editingObservation,
            },
          ],
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        if (response.status === 401) {
          setIsAdminUnlocked(false);
        }

        setEditError(payload?.error ?? "No he podido guardar la observación.");
        return;
      }

      setCurrentYearObservations((current) =>
        buildNextYearObservations(current, yearKey, editingObservation),
      );
      setEditingYearKey("");
      setEditingObservation("");
      setEditFeedbackYearKey(yearKey);
      setEditSuccess(
        editingObservation.trim()
          ? `Observación de ${yearKey} guardada.`
          : `Observación de ${yearKey} borrada.`,
      );
    } catch {
      setEditError("No he podido guardar la observación.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
              Aquellos maravillosos años
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Una línea temporal para ver qué estaba sonando en cada momento.
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Aquí no se entra a buscar con un formulario. Aquí se baja por
                los años y debajo de cada fecha aparecen las carátulas junto al
                nombre del grupo y del disco para leer la historia de una forma
                mucho más visual.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <ShareCardButton anchorId="discos" className="shrink-0" />
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-5 py-3 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>{totalCount} discos en la línea</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/40 px-5 py-4">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
              Totales
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {totalCount}
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/40 px-5 py-4">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
              Años cubiertos
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {visibleYearCount}
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/40 px-5 py-4">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
              Grupos visibles
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {visibleGroupCount}
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Configura las variables de entorno de Supabase para mostrar los
            discos.
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-400/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : discos.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 px-5 py-10 text-sm text-slate-300">
            No hay discos cargados todavía.
          </div>
        ) : (
          <div className="space-y-8">
            <DiscosYearObservationPanel
              years={editableYears}
              initialObservations={currentYearObservations}
              isUnlocked={isAdminUnlocked}
              adminConfigured={adminConfigured}
              onUnlockedChange={setIsAdminUnlocked}
              onObservationsChange={setCurrentYearObservations}
            />

            <div className="flex justify-end">
              <GridDensityControls
                gridDensity={gridDensity}
                setGridDensity={setGridDensity}
                compactTitle="Activar vista compacta de discos"
                denseTitle="Activar vista densa de discos"
              />
            </div>

            <div className="relative space-y-10 md:space-y-14">
              <div className="absolute bottom-0 left-8 top-0 hidden w-px bg-white/10 md:block" />

              {yearSections.map((section) => (
                <div
                  key={section.key}
                  className="relative grid gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:gap-8"
                >
                  <div className="relative md:pl-1">
                    <div className="inline-flex items-center gap-3 md:min-h-[3.5rem]">
                      <span className="relative z-10 hidden h-4 w-4 rounded-full border border-cyan-300/60 bg-slate-950 shadow-[0_0_0_4px_rgba(2,6,23,0.95)] md:block" />
                      <div className="rounded-[1.2rem] border border-cyan-300/28 bg-cyan-300/10 px-4 py-2 text-lg font-semibold text-cyan-100 md:text-xl">
                        {section.label}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-400 md:pl-7">
                      {section.discos.length} disco
                      {section.discos.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="space-y-5">
                    {editingYearKey === section.key ? (
                      <div className="rounded-[1.6rem] border border-cyan-300/25 bg-cyan-300/8 px-5 py-4 shadow-[0_18px_40px_rgba(8,145,178,0.08)]">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">
                              Editando {section.label}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                setEditingYearKey("");
                                setEditingObservation("");
                                setEditError("");
                                setEditSuccess("");
                                setEditFeedbackYearKey("");
                              }}
                                className="rounded-full border border-white/12 bg-slate-950/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleInlineObservationSave(section.key)}
                                disabled={isSavingEdit}
                                className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSavingEdit ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={editingObservation}
                            onChange={(event) => setEditingObservation(event.target.value)}
                            rows={6}
                            className="min-h-36 w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                            placeholder={`Observaciones para ${section.label}`}
                          />

                          {editError ? (
                            <p className="text-sm text-rose-200">{editError}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : section.observation ? (
                      <div className="rounded-[1.6rem] border border-cyan-300/18 bg-cyan-300/8 px-5 py-4 shadow-[0_18px_40px_rgba(8,145,178,0.08)]">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-sm leading-7 text-slate-200">
                            {section.observation}
                          </p>
                          {isAdminUnlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingYearKey(section.key);
                                setEditingObservation(section.observation ?? "");
                                setEditError("");
                                setEditSuccess("");
                                setEditFeedbackYearKey("");
                              }}
                              className="shrink-0 rounded-full border border-cyan-300/28 bg-slate-950/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/60 hover:text-white"
                            >
                              Editar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : isAdminUnlocked ? (
                      <div className="rounded-[1.6rem] border border-dashed border-cyan-300/18 bg-cyan-300/6 px-5 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-slate-300">
                            Todavía no hay observaciones para {section.label}.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingYearKey(section.key);
                              setEditingObservation("");
                              setEditError("");
                              setEditSuccess("");
                              setEditFeedbackYearKey("");
                            }}
                            className="shrink-0 rounded-full border border-cyan-300/28 bg-slate-950/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/60 hover:text-white"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {editSuccess &&
                    editingYearKey === "" &&
                    editFeedbackYearKey === section.key ? (
                      <p className="text-sm text-emerald-200">{editSuccess}</p>
                    ) : null}

                    <div className={gridClassName}>
                      {section.discos.map((disco) => {
                        const anchorId = `disco-${disco.id}`;

                        return (
                          <article
                            key={disco.id}
                            id={anchorId}
                            className="group relative scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                          >
                            <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-slate-900">
                              <ShareCardButton
                                anchorId={anchorId}
                                sectionId="discos"
                                className="absolute right-4 top-4 z-10"
                              />

                              {disco.coverSrc ? (
                                <Image
                                  src={disco.coverSrc}
                                  alt={`Carátula de ${disco.title}`}
                                  fill
                                  unoptimized
                                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                                  sizes="(min-width: 1280px) 280px, (min-width: 640px) 50vw, 100vw"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-4 text-center text-[0.72rem] uppercase tracking-[0.28em] text-slate-400">
                                  Sin carátula
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 p-5">
                              <p className="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-cyan-200/88">
                                {disco.groupName ?? "Grupo sin asignar"}
                              </p>
                              <h3 className="text-lg font-semibold leading-tight text-white">
                                {disco.title}
                              </h3>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

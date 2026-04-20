"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { DiscoUploadForm } from "@/components/disco-upload-form";
import { DiscosYearObservationPanel } from "@/components/discos-year-observation-panel";
import {
  GridDensityControls,
  usePersistedGridDensity,
} from "@/components/grid-density-controls";
import { ShareCardButton } from "@/components/share-card-button";
import type { DiscoAsset, DiscoGroupOption } from "@/lib/supabase/discos";

type DiscosViewerProps = {
  discos: DiscoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  yearObservations: Record<string, string>;
  adminConfigured: boolean;
  initiallyAdminUnlocked: boolean;
  yearSpotifyPlaylists: Record<
    string,
    {
      name: string;
      externalUrl: string;
      trackCount: number;
    }
  >;
  groupOptions: DiscoGroupOption[];
};

type YearSection = {
  key: string;
  label: string;
  discos: DiscoAsset[];
  observation: string | null;
  spotifyPlaylist:
    | {
        name: string;
        externalUrl: string;
        trackCount: number;
      }
    | null;
};

const DISCOS_VIEWER_GRID_STORAGE_KEY = "discos-viewer-grid-density";

function SpotifyLogoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="8.25" fill="#1DB954" stroke="none" />
      <path d="M8.2 10.15c2.45-.78 5.43-.58 7.78.54" />
      <path d="M8.95 12.55c2-.58 4.28-.41 6.18.5" />
      <path d="M9.8 14.8c1.5-.38 3.1-.26 4.48.38" />
    </svg>
  );
}

function compareDiscoAssets(left: DiscoAsset, right: DiscoAsset) {
  if (
    typeof left.year === "number" &&
    typeof right.year === "number" &&
    left.year !== right.year
  ) {
    return left.year - right.year;
  }

  if (
    left.releaseDate &&
    right.releaseDate &&
    left.releaseDate !== right.releaseDate
  ) {
    return left.releaseDate.localeCompare(right.releaseDate, "es", {
      numeric: true,
    });
  }

  if (left.releaseDate) {
    return -1;
  }

  if (right.releaseDate) {
    return 1;
  }

  if (left.groupName && right.groupName) {
    const byGroup = left.groupName.localeCompare(right.groupName, "es", {
      sensitivity: "base",
    });

    if (byGroup !== 0) {
      return byGroup;
    }
  } else if (left.groupName) {
    return -1;
  } else if (right.groupName) {
    return 1;
  }

  const byTitle = left.title.localeCompare(right.title, "es", {
    sensitivity: "base",
  });

  if (byTitle !== 0) {
    return byTitle;
  }

  return left.id.localeCompare(right.id, "es", { numeric: true });
}

function sortDiscoAssets(discos: DiscoAsset[]) {
  return [...discos].sort(compareDiscoAssets);
}

function buildYearSections(
  discos: DiscoAsset[],
  yearObservations: Record<string, string>,
  yearSpotifyPlaylists: Record<
    string,
    {
      name: string;
      externalUrl: string;
      trackCount: number;
    }
  >,
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
      spotifyPlaylist: yearSpotifyPlaylists[sectionKey] ?? null,
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

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
    </svg>
  );
}

export function DiscosViewer({
  discos,
  configured,
  error,
  totalCount,
  yearObservations,
  adminConfigured,
  initiallyAdminUnlocked,
  yearSpotifyPlaylists,
  groupOptions,
}: DiscosViewerProps) {
  const router = useRouter();
  const [currentDiscos, setCurrentDiscos] = useState(() => sortDiscoAssets(discos));
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
  const [editingDiscoId, setEditingDiscoId] = useState("");
  const [discoEditSuccess, setDiscoEditSuccess] = useState("");
  const [discoFeedbackId, setDiscoFeedbackId] = useState("");

  useEffect(() => {
    setIsAdminUnlocked(initiallyAdminUnlocked);
  }, [initiallyAdminUnlocked]);

  useEffect(() => {
    setCurrentDiscos(sortDiscoAssets(discos));
  }, [discos]);

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
      setEditingDiscoId("");
      setDiscoEditSuccess("");
      setDiscoFeedbackId("");
    }
  }, [isAdminUnlocked]);

  const yearSections = buildYearSections(
    currentDiscos,
    currentYearObservations,
    yearSpotifyPlaylists,
  );
  const editableYears = yearSections
    .filter((section) => section.key !== "sin-ano")
    .map((section) => section.key);
  const visibleGroupCount = new Set(
    currentDiscos.map((disco) => disco.groupName).filter(Boolean),
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

  async function ensureAdminUnlocked() {
    if (isAdminUnlocked) {
      return true;
    }

    if (!adminConfigured) {
      window.alert("Falta ADMIN_PASSWORD en el entorno del servidor.");
      return false;
    }

    const password = window.prompt("Contraseña admin");

    if (!password?.trim()) {
      return false;
    }

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        window.alert(payload?.error ?? "No he podido validar la contraseña.");
        return false;
      }

      setIsAdminUnlocked(true);
      return true;
    } catch {
      window.alert("No he podido validar la contraseña.");
      return false;
    }
  }

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
            observations?: Record<string, string>;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        if (response.status === 401) {
          setIsAdminUnlocked(false);
        }

        setEditError(payload?.error ?? "No he podido guardar la observación.");
        return;
      }

      setCurrentYearObservations(
        payload?.observations ??
          buildNextYearObservations(
            currentYearObservations,
            yearKey,
            editingObservation,
          ),
      );
      setEditingYearKey("");
      setEditingObservation("");
      setEditFeedbackYearKey(yearKey);
      setEditSuccess(
        editingObservation.trim()
          ? `Observación de ${yearKey} guardada.`
          : `Observación de ${yearKey} borrada.`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setEditError("No he podido guardar la observación.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleStartDiscoEdit(disco: DiscoAsset) {
    const adminReady = await ensureAdminUnlocked();

    if (!adminReady) {
      return;
    }

    setEditingDiscoId(disco.id);
    setDiscoEditSuccess("");
    setDiscoFeedbackId("");
  }

  function handleCancelDiscoEdit() {
    setEditingDiscoId("");
  }

  function handleDiscoSaved(updatedDisco: DiscoAsset) {
    setCurrentDiscos((current) =>
      sortDiscoAssets(
        current.map((disco) =>
          disco.id === updatedDisco.id ? updatedDisco : disco,
        ),
      ),
    );
    setEditingDiscoId("");
    setDiscoFeedbackId(updatedDisco.id);
    setDiscoEditSuccess(`Datos de ${updatedDisco.title} guardados.`);
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

              {yearSections.map((section) => {
                const yearAnchorId = `discos-year-${section.key}`;

                return (
                  <div
                    key={section.key}
                    id={yearAnchorId}
                    className="relative grid scroll-mt-32 gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:gap-8"
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
                      {section.spotifyPlaylist ? (
                        <a
                          href={section.spotifyPlaylist.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-[radial-gradient(circle_at_top,rgba(29,185,84,0.22),rgba(15,23,42,0.92))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200/55 hover:text-white md:ml-7"
                          aria-label={`Escuchar playlist ${section.spotifyPlaylist.name} en Spotify`}
                          title={`Escuchar ${section.spotifyPlaylist.name} en Spotify`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                          <span>Escuchar</span>
                        </a>
                      ) : null}
                    </div>

                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          {isAdminUnlocked && section.key !== "sin-ano" ? (
                            <DiscoUploadForm
                              year={section.key}
                              groupOptions={groupOptions}
                              editingDisco={
                                section.discos.find(
                                  (disco) => disco.id === editingDiscoId,
                                ) ?? null
                              }
                              onEditCancel={handleCancelDiscoEdit}
                              onDiscoSaved={handleDiscoSaved}
                              onAdminSessionExpired={() => setIsAdminUnlocked(false)}
                            />
                          ) : null}
                        </div>
                        <ShareCardButton
                          anchorId={yearAnchorId}
                          sectionId="discos"
                          className="h-9 w-9 shrink-0 self-end sm:self-start"
                        />
                      </div>

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
                              onChange={(event) =>
                                setEditingObservation(event.target.value)
                              }
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
                          const discoAnchorId = `disco-${disco.id}`;

                          return (
                            <article
                              key={disco.id}
                              id={discoAnchorId}
                              className="group relative scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
                            >
                            <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-slate-900">
                              {adminConfigured ? (
                                <button
                                  type="button"
                                  onClick={() => void handleStartDiscoEdit(disco)}
                                  aria-label={`Editar ${disco.title}`}
                                  title={
                                    editingDiscoId === disco.id
                                      ? `Editando ${disco.title}`
                                      : `Editar ${disco.title}`
                                  }
                                  className={`absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-slate-950/72 text-slate-100 shadow-[0_10px_25px_rgba(2,6,23,0.35)] backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                                    editingDiscoId === disco.id
                                      ? "border-cyan-300/60 bg-cyan-300/14 text-cyan-100"
                                      : "border-white/15 hover:border-cyan-300/60 hover:bg-cyan-300/14 hover:text-white"
                                  }`}
                                >
                                  <span className="sr-only">
                                    {editingDiscoId === disco.id
                                      ? `Editando ${disco.title}`
                                      : `Editar ${disco.title}`}
                                  </span>
                                  <EditIcon />
                                </button>
                              ) : null}

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

                            <div className="space-y-4 p-5">
                              <div className="min-w-0 space-y-2">
                                <p className="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-cyan-200/88">
                                  {disco.groupName ?? "Grupo sin asignar"}
                                </p>
                                <h3 className="text-lg font-semibold leading-tight text-white">
                                  {disco.title}
                                </h3>
                              </div>

                              <div className="space-y-1 text-[0.78rem] leading-5 text-slate-400">
                                <p className="line-clamp-2">
                                  <span className="text-slate-500">
                                    Fecha:
                                  </span>{" "}
                                  {disco.releaseDateLabel ?? "Sin fecha indicada"}
                                </p>
                                <p className="line-clamp-2">
                                  <span className="text-slate-500">
                                    Discográfica:
                                  </span>{" "}
                                  {disco.label ?? "Sin discográfica indicada"}
                                </p>
                                <p className="line-clamp-2">
                                  <span className="text-slate-500">
                                    Productor:
                                  </span>{" "}
                                  {disco.producer ?? "Sin productor indicado"}
                                </p>
                                <p className="line-clamp-2">
                                  <span className="text-slate-500">
                                    Estudio:
                                  </span>{" "}
                                  {disco.studio ?? "Sin estudio indicado"}
                                </p>
                              </div>

                              {disco.spotifyUrl ? (
                                <a
                                  href={disco.spotifyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/30 bg-[radial-gradient(circle_at_top,rgba(29,185,84,0.18),rgba(15,23,42,0.92))] text-emerald-100 transition hover:border-emerald-200/55 hover:text-white"
                                  aria-label={`Abrir ${disco.title} en Spotify`}
                                  title={`Abrir ${disco.title} en Spotify`}
                                >
                                  <SpotifyLogoIcon />
                                </a>
                              ) : null}

                              {discoEditSuccess &&
                              editingDiscoId === "" &&
                              discoFeedbackId === disco.id ? (
                                <p className="text-sm text-emerald-200">
                                  {discoEditSuccess}
                                </p>
                              ) : null}
                            </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

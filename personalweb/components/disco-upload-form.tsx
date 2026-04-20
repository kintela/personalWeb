"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type {
  DiscoAsset,
  DiscoGroupOption,
} from "@/lib/supabase/discos";

type DiscoUploadFormProps = {
  year: string;
  groupOptions: DiscoGroupOption[];
  editingDisco?: DiscoAsset | null;
  onEditCancel?: () => void;
  onDiscoSaved?: (disco: DiscoAsset) => void;
  onAdminSessionExpired?: () => void;
};

type DiscoFormState = {
  nombre: string;
  yearPublicacion: string;
  fechaPublicacion: string;
  discografica: string;
  productor: string;
  estudio: string;
  spotify: string;
  observaciones: string;
  grupoId: string;
};

function buildInitialUploadState(year: string): DiscoFormState {
  return {
    nombre: "",
    yearPublicacion: year,
    fechaPublicacion: "",
    discografica: "",
    productor: "",
    estudio: "",
    spotify: "",
    observaciones: "",
    grupoId: "",
  };
}

function buildEditState(disco: DiscoAsset): DiscoFormState {
  return {
    nombre: disco.title,
    yearPublicacion: Number.isInteger(disco.year) ? String(disco.year) : "",
    fechaPublicacion: disco.releaseDate ?? "",
    discografica: disco.label ?? "",
    productor: disco.producer ?? "",
    estudio: disco.studio ?? "",
    spotify: disco.spotifyUrl ?? "",
    observaciones: disco.observations ?? "",
    grupoId: disco.groupId,
  };
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 KB";
  }

  return `${(bytes / 1024).toFixed(bytes >= 1024 * 100 ? 0 : 1)} KB`;
}

export function DiscoUploadForm({
  year,
  groupOptions,
  editingDisco = null,
  onEditCancel,
  onDiscoSaved,
  onAdminSessionExpired,
}: DiscoUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(() => buildInitialUploadState(year));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const isEditMode = Boolean(editingDisco);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!editingDisco) {
      return;
    }

    setFormState(buildEditState(editingDisco));
    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess("");
    setIsOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    requestAnimationFrame(() => {
      formContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [editingDisco]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    setFormState((current) =>
      current.yearPublicacion === year
        ? current
        : {
            ...current,
            yearPublicacion: year,
          },
    );
  }, [isEditMode, year]);

  function resetForm(nextYear = year) {
    setFormState(buildInitialUploadState(nextYear));
    setSelectedFile(null);
    setUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setUploadError("");
    setUploadSuccess("");
  }

  function handleCancelEdit() {
    resetForm(year);
    setUploadSuccess("");
    setIsOpen(false);
    onEditCancel?.();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombre = formState.nombre.trim();
    const discografica = formState.discografica.trim();
    const productor = formState.productor.trim();
    const estudio = formState.estudio.trim();
    const spotify = formState.spotify.trim();
    const observaciones = formState.observaciones.trim();
    const fechaPublicacion = formState.fechaPublicacion.trim();
    const yearPublicacion = Number.parseInt(
      formState.yearPublicacion.trim(),
      10,
    );
    const grupoId = Number.parseInt(formState.grupoId.trim(), 10);

    if (!nombre || !discografica || !productor) {
      setUploadError("Nombre, discográfica y productor son obligatorios.");
      return;
    }

    if (
      !Number.isInteger(yearPublicacion) ||
      yearPublicacion < 1900 ||
      yearPublicacion > 2100
    ) {
      setUploadError(
        "El año de publicación debe ser un entero entre 1900 y 2100.",
      );
      return;
    }

    if (!Number.isInteger(grupoId) || grupoId <= 0) {
      setUploadError("Tienes que seleccionar un grupo válido.");
      return;
    }

    if (
      fechaPublicacion &&
      Number.parseInt(fechaPublicacion.slice(0, 4), 10) !== yearPublicacion
    ) {
      setUploadError(
        "La fecha de publicación debe pertenecer al mismo año indicado.",
      );
      return;
    }

    if (!isEditMode && !selectedFile) {
      setUploadError("Tienes que seleccionar una carátula.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      if (editingDisco) {
        const response = await fetch(
          `/api/discos/${encodeURIComponent(editingDisco.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nombre,
              yearPublicacion,
              fechaPublicacion,
              discografica,
              productor,
              estudio,
              spotify,
              observaciones,
              groupId: grupoId,
            }),
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              disco?: DiscoAsset;
            }
          | null;

        if (!response.ok || !payload?.ok || !payload.disco) {
          if (response.status === 401) {
            onAdminSessionExpired?.();
          }

          setUploadError(
            payload?.error ?? "No he podido guardar los datos del disco.",
          );
          return;
        }

        onDiscoSaved?.(payload.disco);
        resetForm(year);
        setIsOpen(false);
        onEditCancel?.();
        startTransition(() => {
          router.refresh();
        });
        return;
      }

      const formData = new FormData();

      formData.set("file", selectedFile as File);
      formData.set("nombre", nombre);
      formData.set("year_publicacion", String(yearPublicacion));
      formData.set("fecha_publicacion", fechaPublicacion);
      formData.set("discografica", discografica);
      formData.set("productor", productor);
      formData.set("estudio", estudio);
      formData.set("spotify", spotify);
      formData.set("observaciones", observaciones);
      formData.set("grupo_id", String(grupoId));

      const response = await fetch("/api/discos/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            imageName?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        if (response.status === 401) {
          onAdminSessionExpired?.();
        }

        setUploadError(payload?.error ?? "No he podido crear el disco.");
        return;
      }

      setUploadSuccess(
        `Disco guardado correctamente con la carátula ${payload.imageName ?? "nueva"}.`,
      );
      resetForm(year);
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setUploadError(
        editingDisco
          ? "No he podido guardar los datos del disco."
          : "No he podido crear el disco.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div ref={formContainerRef} className="space-y-4">
      {!isEditMode ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => {
              setIsOpen((current) => !current);
              setUploadError("");
              setUploadSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/60 hover:text-white"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Cerrar alta de disco en ${year}` : `Abrir alta de disco en ${year}`}
          >
            <span className="text-sm leading-none">{isOpen ? "−" : "+"}</span>
            <span>Añadir disco</span>
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <form
          className="space-y-5 rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
              {editingDisco ? "Editar disco" : "Alta de disco"}
            </h4>
            <p className="text-sm text-slate-400">
              {editingDisco
                ? "Edita aquí los datos del disco. Si cambias el año, se recolocará en su nueva sección al guardar."
                : `El año queda fijado en ${year} y la carátula se subirá a \`caratulas/discos\` con el siguiente número libre.`}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-200">Nombre</span>
              <input
                type="text"
                value={formState.nombre}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="Título del disco"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-200">Grupo</span>
              <select
                value={formState.grupoId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    grupoId: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                required
              >
                <option value="">Selecciona un grupo</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            {editingDisco ? (
              <label className="space-y-2">
                <span className="text-sm text-slate-200">Año</span>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={formState.yearPublicacion}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      yearPublicacion: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  required
                />
              </label>
            ) : null}

            <label className="space-y-2">
              <span className="text-sm text-slate-200">Fecha de publicación</span>
              <input
                type="date"
                value={formState.fechaPublicacion}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    fechaPublicacion: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-200">Discográfica</span>
              <input
                type="text"
                value={formState.discografica}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    discografica: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="Sello o discográfica"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-200">Productor</span>
              <input
                type="text"
                value={formState.productor}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    productor: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="Productor o productores"
                required
              />
            </label>

            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm text-slate-200">Estudio</span>
              <input
                type="text"
                value={formState.estudio}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    estudio: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="Estudio o estudios de grabación"
              />
            </label>

            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm text-slate-200">Spotify</span>
              <input
                type="url"
                value={formState.spotify}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    spotify: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="https://open.spotify.com/album/..."
                inputMode="url"
              />
            </label>

            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm text-slate-200">Observaciones</span>
              <textarea
                value={formState.observaciones}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    observaciones: event.target.value,
                  }))
                }
                rows={4}
                className="min-h-28 w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="Notas que solo se mostrarán en el tooltip de la tarjeta"
              />
            </label>
          </div>

          {!editingDisco ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-2">
                <span className="text-sm text-slate-200">Carátula</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif"
                  onChange={handleFileInputChange}
                  className="block w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                  required
                />
                {selectedFile ? (
                  <p className="text-xs text-slate-400">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Se renombrará automáticamente con el siguiente número libre.
                  </p>
                )}
              </label>

              <div className="space-y-2">
                <span className="text-sm text-slate-200">Vista previa</span>
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/35">
                  {selectedFilePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedFilePreviewUrl}
                      alt={`Vista previa de ${selectedFile?.name ?? "la carátula"}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <p className="px-4 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
                      Sin vista previa
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              La carátula se mantiene como está. Si luego quieres cambiarla,
              habría que añadir esa acción aparte.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {uploadError ? (
                <p className="text-sm text-rose-200">{uploadError}</p>
              ) : null}
              {uploadSuccess ? (
                <p className="text-sm text-emerald-200">{uploadSuccess}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {editingDisco ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-2xl border border-white/12 bg-slate-950/55 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Cancelar
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isUploading}
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading
                  ? "Guardando..."
                  : editingDisco
                  ? "Guardar cambios"
                  : `Guardar disco en ${year}`}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

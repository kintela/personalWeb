"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { DiscoGroupOption } from "@/lib/supabase/discos";

type DiscoUploadFormProps = {
  year: string;
  groupOptions: DiscoGroupOption[];
};

type DiscoUploadState = {
  nombre: string;
  discografica: string;
  productor: string;
  grupoId: string;
};

const INITIAL_UPLOAD_STATE: DiscoUploadState = {
  nombre: "",
  discografica: "",
  productor: "",
  grupoId: "",
};

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 KB";
  }

  return `${(bytes / 1024).toFixed(bytes >= 1024 * 100 ? 0 : 1)} KB`;
}

export function DiscoUploadForm({
  year,
  groupOptions,
}: DiscoUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(INITIAL_UPLOAD_STATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const yearValue = useMemo(() => Number.parseInt(year, 10), [year]);

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

  function resetForm() {
    setFormState(INITIAL_UPLOAD_STATE);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setUploadError("");
    setUploadSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!Number.isInteger(yearValue)) {
      setUploadError("El año asociado no es válido.");
      return;
    }

    if (!selectedFile) {
      setUploadError("Tienes que seleccionar una carátula.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();

      formData.set("file", selectedFile);
      formData.set("nombre", formState.nombre.trim());
      formData.set("year_publicacion", String(yearValue));
      formData.set("discografica", formState.discografica.trim());
      formData.set("productor", formState.productor.trim());
      formData.set("grupo_id", formState.grupoId);

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
        setUploadError(payload?.error ?? "No he podido crear el disco.");
        return;
      }

      setUploadSuccess(
        `Disco guardado correctamente con la carátula ${payload.imageName ?? "nueva"}.`,
      );
      resetForm();
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setUploadError("No he podido crear el disco.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
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

      {isOpen ? (
        <form
          className="space-y-5 rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
              Alta de disco
            </h4>
            <p className="text-sm text-slate-400">
              El año queda fijado en {year} y la carátula se subirá a
              `caratulas/discos` con el siguiente número libre.
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
          </div>

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {uploadError ? (
                <p className="text-sm text-rose-200">{uploadError}</p>
              ) : null}
              {uploadSuccess ? (
                <p className="text-sm text-emerald-200">{uploadSuccess}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Guardando..." : `Guardar disco en ${year}`}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

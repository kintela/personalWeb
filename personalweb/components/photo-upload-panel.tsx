"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_UPLOAD_BYTES = 500 * 1024;
const ORIGIN_OPTIONS = ["Facebook", "Spotify", "Propia", "Instagram"] as const;

type PhotoUploadPanelProps = {
  initiallyUnlocked: boolean;
};

type UploadFormState = {
  title: string;
  people: string;
  year: string;
  groupName: string;
  origin: (typeof ORIGIN_OPTIONS)[number];
  description: string;
  date: string;
  place: string;
  category: string;
  concertId: string;
};

const INITIAL_FORM_STATE: UploadFormState = {
  title: "",
  people: "",
  year: "",
  groupName: "",
  origin: "Facebook",
  description: "",
  date: "",
  place: "",
  category: "",
  concertId: "",
};

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 KB";
  }

  return `${(bytes / 1024).toFixed(bytes >= 1024 * 100 ? 0 : 1)} KB`;
}

function replaceExtension(fileName: string, extension: string) {
  return fileName.replace(/\.[^.]+$/, "") + `.${extension}`;
}

function blobToFile(blob: Blob, fileName: string, type: string) {
  return new File([blob], fileName, {
    type,
    lastModified: Date.now(),
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No he podido preparar la imagen para la subida."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No he podido leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}

async function ensureImageWithinLimit(file: File) {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return {
      file,
      compressed: false,
    };
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No he podido preparar el lienzo para comprimir la imagen.");
  }

  const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34];
  let scale = 1;
  let smallestFile: File | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      const candidate = blobToFile(blob, replaceExtension(file.name, "jpg"), "image/jpeg");

      if (!smallestFile || candidate.size < smallestFile.size) {
        smallestFile = candidate;
      }

      if (candidate.size <= MAX_UPLOAD_BYTES) {
        return {
          file: candidate,
          compressed: true,
        };
      }
    }

    scale *= 0.85;
  }

  if (smallestFile && smallestFile.size <= MAX_UPLOAD_BYTES) {
    return {
      file: smallestFile,
      compressed: true,
    };
  }

  throw new Error("No he conseguido dejar la imagen por debajo de 500 KB.");
}

export function PhotoUploadPanel({
  initiallyUnlocked,
}: PhotoUploadPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(initiallyUnlocked);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadInfo, setUploadInfo] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUnlocking(true);
    setUnlockError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: unlockPassword }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setUnlockError(payload.error ?? "No he podido validar la contraseña.");
        return;
      }

      setIsUnlocked(true);
      setUnlockPassword("");
      setUnlockError("");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError("Selecciona una imagen antes de subirla.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");
    setUploadInfo("");

    try {
      const preparedImage = await ensureImageWithinLimit(selectedFile);
      const payload = new FormData();

      payload.set("file", preparedImage.file);
      payload.set("title", formState.title);
      payload.set("people", formState.people);
      payload.set("year", formState.year);
      payload.set("groupName", formState.groupName);
      payload.set("origin", formState.origin);
      payload.set("description", formState.description);
      payload.set("date", formState.date);
      payload.set("place", formState.place);
      payload.set("category", formState.category);
      payload.set("concertId", formState.concertId);

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        imageName?: string;
      };

      if (!response.ok || !result.ok) {
        setUploadError(result.error ?? "No he podido subir la foto.");
        return;
      }

      setUploadSuccess(
        `Foto subida correctamente como ${result.imageName ?? "nueva imagen"}.`,
      );
      setUploadInfo(
        preparedImage.compressed
          ? `La imagen se ha comprimido a ${formatBytes(preparedImage.file.size)}.`
          : `La imagen ya cumplia el limite de ${formatBytes(preparedImage.file.size)}.`,
      );
      setFormState(INITIAL_FORM_STATE);
      setSelectedFile(null);
      router.refresh();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "No he podido subir la foto.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="rounded-full border border-white/12 bg-black/25 px-4 py-2 text-xl leading-none text-slate-100 transition hover:border-cyan-300/50 hover:text-white"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cerrar alta de foto" : "Abrir alta de foto"}
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>

      {isOpen ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          {!isUnlocked ? (
            <form className="space-y-4" onSubmit={handleUnlock}>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                  Nueva foto
                </h3>
                <p className="text-sm text-slate-400">
                  Introduce la contraseña admin para mostrar el formulario de alta.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(event) => setUnlockPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="Contraseña admin"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUnlocking ? "Validando..." : "Desbloquear"}
                </button>
              </div>

              {unlockError ? (
                <p className="text-sm text-rose-200">{unlockError}</p>
              ) : null}
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleUpload}>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                  Alta de foto
                </h3>
                <p className="text-sm text-slate-400">
                  La imagen se nombrara automaticamente con el siguiente numero libre del bucket.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Imagen</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Limite final: 500 KB. Si hace falta, la imagen se comprimira antes de subir.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Titulo</span>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Personas</span>
                  <textarea
                    value={formState.people}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        people: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="John Lennon, Paul McCartney"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Grupo</span>
                  <input
                    type="text"
                    value={formState.groupName}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        groupName: event.target.value,
                      }))
                    }
                    placeholder="Nombre exacto del grupo"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Origen</span>
                  <select
                    value={formState.origin}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        origin: event.target.value as UploadFormState["origin"],
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  >
                    {ORIGIN_OPTIONS.map((origin) => (
                      <option key={origin} value={origin}>
                        {origin}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Anio</span>
                  <input
                    type="number"
                    value={formState.year}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        year: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Fecha</span>
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Lugar</span>
                  <input
                    type="text"
                    value={formState.place}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        place: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Categoria</span>
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-200">Concierto ID</span>
                  <input
                    type="number"
                    value={formState.concertId}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        concertId: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm text-slate-200">Descripcion</span>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Subiendo..." : "Subir foto"}
                </button>
                {selectedFile ? (
                  <span className="text-sm text-slate-400">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </span>
                ) : null}
              </div>

              {uploadError ? (
                <p className="text-sm text-rose-200">{uploadError}</p>
              ) : null}
              {uploadSuccess ? (
                <div className="space-y-1 text-sm text-emerald-200">
                  <p>{uploadSuccess}</p>
                  {uploadInfo ? <p className="text-emerald-100/80">{uploadInfo}</p> : null}
                </div>
              ) : null}
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}

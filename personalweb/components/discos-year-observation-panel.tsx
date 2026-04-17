"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type FormEvent } from "react";

type DiscosYearObservationPanelProps = {
  years: string[];
  initialObservations: Record<string, string>;
  isUnlocked: boolean;
  adminConfigured: boolean;
  onUnlockedChange: (nextValue: boolean) => void;
  onObservationsChange: (nextValue: Record<string, string>) => void;
};

function buildInitialDrafts(
  years: string[],
  initialObservations: Record<string, string>,
) {
  const drafts: Record<string, string> = {};

  for (const year of years) {
    drafts[year] = initialObservations[year] ?? "";
  }

  return drafts;
}

export function DiscosYearObservationPanel({
  years,
  initialObservations,
  isUnlocked,
  adminConfigured,
  onUnlockedChange,
  onObservationsChange,
}: DiscosYearObservationPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [draftObservations, setDraftObservations] = useState(() =>
    buildInitialDrafts(years, initialObservations),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const yearsKey = years.join("|");

  useEffect(() => {
    const nextYears = yearsKey ? yearsKey.split("|") : [];

    setDraftObservations(buildInitialDrafts(nextYears, initialObservations));
  }, [yearsKey, initialObservations]);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!adminConfigured) {
      setUnlockError("Falta ADMIN_PASSWORD en el entorno del servidor.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError("");
    setSaveError("");
    setSaveSuccess("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: unlockPassword }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setUnlockError(payload?.error ?? "No he podido validar la contraseña.");
        return;
      }

      onUnlockedChange(true);
      setUnlockPassword("");
    } catch {
      setUnlockError("No he podido validar la contraseña.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const response = await fetch("/api/discos/year-observations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          entries: years.map((year) => ({
            yearPublicacion: Number(year),
            observaciones: draftObservations[year] ?? "",
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            updatedCount?: number;
            deletedCount?: number;
            observations?: Record<string, string>;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        if (response.status === 401) {
          onUnlockedChange(false);
        }

        setSaveError(payload?.error ?? "No he podido guardar las observaciones.");
        return;
      }

      const updatedCount = payload.updatedCount ?? 0;
      const deletedCount = payload.deletedCount ?? 0;
      const successParts = [];

      if (updatedCount > 0) {
        successParts.push(
          `${updatedCount} año${updatedCount === 1 ? "" : "s"} guardado${updatedCount === 1 ? "" : "s"}`,
        );
      }

      if (deletedCount > 0) {
        successParts.push(
          `${deletedCount} año${deletedCount === 1 ? "" : "s"} limpiado${deletedCount === 1 ? "" : "s"}`,
        );
      }

      setSaveSuccess(
        successParts.length > 0
          ? `${successParts.join(" y ")} correctamente.`
          : "No había cambios que guardar.",
      );
      onObservationsChange(
        payload?.observations ??
          Object.fromEntries(
            Object.entries(draftObservations)
              .map(([year, observation]) => [year, observation.trim()])
              .filter(([, observation]) => observation.length > 0),
          ),
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSaveError("No he podido guardar las observaciones.");
    } finally {
      setIsSaving(false);
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
          aria-label={
            isOpen
              ? "Cerrar editor de observaciones por año"
              : "Abrir editor de observaciones por año"
          }
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
                  Observaciones por año
                </h3>
                <p className="text-sm text-slate-400">
                  Introduce la contraseña admin para abrir el editor.
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
            <form className="space-y-5" onSubmit={handleSave}>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                  Editor de observaciones por año
                </h3>
                <p className="text-sm text-slate-400">
                  Cada caja corresponde a un año de la línea temporal. Si dejas
                  una vacía, se borra su observación al guardar.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {years.map((year) => (
                  <label
                    key={year}
                    className="space-y-2 rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
                  >
                    <span className="text-sm font-semibold text-cyan-100">
                      {year}
                    </span>
                    <textarea
                      value={draftObservations[year] ?? ""}
                      onChange={(event) =>
                        setDraftObservations((current) => ({
                          ...current,
                          [year]: event.target.value,
                        }))
                      }
                      rows={6}
                      className="min-h-36 w-full rounded-[1rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      placeholder={`Observaciones para ${year}`}
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  {saveError ? (
                    <p className="text-sm text-rose-200">{saveError}</p>
                  ) : null}
                  {saveSuccess ? (
                    <p className="text-sm text-emerald-200">{saveSuccess}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Guardando..." : "Guardar observaciones"}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}

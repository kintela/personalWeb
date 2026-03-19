import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { getPhotoAudit } from "@/lib/admin/photos-audit";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "invalid-password":
      return "La contraseña no es correcta.";
    case "missing-config":
      return "Falta ADMIN_PASSWORD en el entorno del servidor.";
    default:
      return "";
  }
}

function renderList(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyMessage}</p>;
  }

  const preview = items.slice(0, 40);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Mostrando {preview.length} de {items.length}.
      </p>
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-200">
          {preview.join(", ")}
        </pre>
      </div>
    </div>
  );
}

function renderGapSummary(
  title: string,
  min: number | null,
  max: number | null,
  gapCount: number,
  gapPreview: string[],
) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">
          Rango numérico:{" "}
          <span className="font-medium text-slate-200">
            {min ?? "sin datos"} {min !== null && max !== null ? `a ${max}` : ""}
          </span>
        </p>
        <p className="text-sm text-slate-400">
          Huecos detectados:{" "}
          <span className="font-medium text-slate-200">{gapCount}</span>
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm leading-6 text-slate-200">
          {gapPreview.length > 0 ? gapPreview.join(", ") : "Sin huecos dentro del rango."}
        </p>
      </div>
    </section>
  );
}

export default async function AdminPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const errorMessage = getErrorMessage(getSingleValue(searchParams.error));
  const configured = isAdminConfigured();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-8 sm:px-10">
          <section className="w-full rounded-[2.5rem] border border-white/10 bg-white/6 p-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:p-10">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Admin
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Auditor de fotos
              </h1>
              <p className="text-base leading-8 text-slate-300">
                Este acceso queda protegido con una sola contraseña y sirve para
                revisar si la tabla <code>public.fotos</code> y el bucket están
                sincronizados.
              </p>
            </div>

            {!configured ? (
              <div className="mt-8 rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-100">
                Añade <code>ADMIN_PASSWORD</code> en{" "}
                <code>personalweb/.env.local</code>. Si quieres que la cookie de
                sesión quede mejor firmada, añade también{" "}
                <code>ADMIN_SESSION_SECRET</code>.
              </div>
            ) : (
              <form
                method="post"
                action="/admin/login"
                className="mt-8 space-y-5"
              >
                <label className="block space-y-3">
                  <span className="text-sm font-medium text-slate-200">
                    Contraseña
                  </span>
                  <input
                    type="password"
                    name="password"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {errorMessage ? (
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Entrar
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    );
  }

  const audit = await getPhotoAudit();

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Admin
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Auditor de fotos
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300">
                  Comparación directa entre <code>public.fotos</code> y el
                  bucket <code>{audit.bucket}</code> para localizar faltantes,
                  sobrantes y huecos numéricos.
                </p>
              </div>
            </div>

            <form method="post" action="/admin/logout">
              <button
                type="submit"
                className="rounded-2xl border border-white/15 bg-black/20 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </section>

        {audit.error ? (
          <section className="rounded-[1.75rem] border border-rose-300/20 bg-rose-400/10 p-6 text-sm leading-7 text-rose-100">
            {audit.error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Registros BD
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {audit.databaseCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Archivos bucket
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {audit.storageCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Coinciden
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {audit.matchedCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Estado
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {audit.error ? "Revisar" : "OK"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {renderGapSummary(
            "Secuencia en base de datos",
            audit.databaseSequence.min,
            audit.databaseSequence.max,
            audit.databaseSequence.gapCount,
            audit.databaseSequence.gapPreview,
          )}
          {renderGapSummary(
            "Secuencia en bucket",
            audit.storageSequence.min,
            audit.storageSequence.max,
            audit.storageSequence.gapCount,
            audit.storageSequence.gapPreview,
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">
                Están en BD pero faltan en el bucket
              </h2>
              <p className="text-sm text-slate-400">
                Total: {audit.missingInStorage.length}
              </p>
            </div>
            <div className="mt-4">
              {renderList(
                audit.missingInStorage,
                "No falta ninguna imagen de la base de datos en el bucket.",
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">
                Están en el bucket pero no en BD
              </h2>
              <p className="text-sm text-slate-400">
                Total: {audit.missingInDatabase.length}
              </p>
            </div>
            <div className="mt-4">
              {renderList(
                audit.missingInDatabase,
                "No sobra ninguna imagen en el bucket.",
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

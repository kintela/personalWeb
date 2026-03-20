import type { PhotoPerson } from "@/lib/supabase/photos";

type PhotoPeopleListProps = {
  people: PhotoPerson[];
  configured: boolean;
  error: string | null;
  totalPeople: number;
  totalAppearances: number;
};

export function PhotoPeopleList({
  people,
  configured,
  error,
  totalPeople,
  totalAppearances,
}: PhotoPeopleListProps) {
  return (
    <section className="space-y-6 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(3,7,18,0.24)] backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300/85">
            Personas
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Quien sale por aqui
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Listado unico de personas etiquetadas en las fotos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
          <span className="h-2 w-2 rounded-full bg-cyan-300" />
          <span>
            {totalPeople} personas · {totalAppearances} apariciones
          </span>
        </div>
      </div>

      {!configured ? (
        <div className="rounded-3xl border border-amber-300/30 bg-amber-300/8 p-5 text-sm leading-7 text-amber-50">
          Faltan datos de conexión a Supabase para poder leer la lista de
          personas.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      {configured && !error && people.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-black/15 px-6 py-12 text-center text-sm leading-7 text-slate-300">
          No hay personas etiquetadas en las fotos de este bucket.
        </div>
      ) : null}

      {people.length > 0 ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
          <div className="max-h-[34rem] overflow-y-auto pr-2">
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {people.map((person) => (
                <li
                  key={person.name}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-white">
                    {person.name}
                  </span>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                    {person.photoCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { PhotoViewer } from "@/components/photo-viewer";
import { getPhotoGallery } from "@/lib/supabase/photos";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "", 10);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const gallery = await getPhotoGallery(parsePage(searchParams.page));

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
            <div className="space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Personal Web
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Una base limpia para tu web personal y tu archivo de fotos.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                  He dejado preparada la primera sección dinámica: una galería
                  conectada a Supabase que lee el bucket de fotos y abre cada
                  imagen en un visor ampliado.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Bucket
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {gallery.bucket}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Fotos
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {gallery.totalCount}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Estado
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {gallery.error ? "Revisar" : "Conectado"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <PhotoViewer
          photos={gallery.photos}
          bucketName={gallery.bucket}
          configured={gallery.configured}
          error={gallery.error}
          totalCount={gallery.totalCount}
          loadedCount={gallery.loadedCount}
          currentPage={gallery.currentPage}
          totalPages={gallery.totalPages}
          pageSize={gallery.pageSize}
        />
      </div>
    </main>
  );
}

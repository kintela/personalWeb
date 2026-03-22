import { CdsViewer } from "@/components/cds-viewer";
import { BooksViewer } from "@/components/books-viewer";
import { ConcertsViewer } from "@/components/concerts-viewer";
import { PhotoViewer } from "@/components/photo-viewer";
import { VideosViewer } from "@/components/videos-viewer";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  normalizePhotoFilterValue,
  normalizePhotoPeopleGroup,
} from "@/lib/photo-filters";
import { getCdList } from "@/lib/supabase/cds";
import { getBookList } from "@/lib/supabase/books";
import { getConcertList } from "@/lib/supabase/concerts";
import { getPhotoGallery } from "@/lib/supabase/photos";
import { getVideoList } from "@/lib/supabase/videos";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SECTION_SHORTCUTS = [
  {
    href: "#fotos",
    label: "Fotos",
    eyebrow: "Photo Viewer",
  },
  {
    href: "#conciertos",
    label: "Conciertos",
    eyebrow: "Directo",
  },
  {
    href: "#cds",
    label: "CDs",
    eyebrow: "Discoteca",
  },
  {
    href: "#libros",
    label: "Libros",
    eyebrow: "Lecturas",
  },
  {
    href: "#videos",
    label: "Vídeos",
    eyebrow: "Películas",
  },
] as const;

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

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
  const filterValue = normalizePhotoFilterValue(
    getSingleValue(searchParams.filterValue),
  );
  const peopleGroup = normalizePhotoPeopleGroup(
    getSingleValue(searchParams.peopleGroup),
  );
  const concertFilterValue = getSingleValue(searchParams.concertFilter).trim();
  const concertYearValue = getSingleValue(searchParams.concertYear).trim();
  const concertCityValue = getSingleValue(searchParams.concertCity).trim();
  const concertGroupValue = getSingleValue(searchParams.concertGroup).trim();
  const cdFilterValue = getSingleValue(searchParams.cdFilter).trim();
  const cdGroupValue = getSingleValue(searchParams.cdGroup).trim();
  const cdYearValue = getSingleValue(searchParams.cdYear).trim();
  const cdSpotifyValue = getSingleValue(searchParams.cdSpotify).trim();
  const bookFilterValue = getSingleValue(searchParams.bookFilter).trim();
  const bookCategoryValue = getSingleValue(searchParams.bookCategory).trim();
  const bookProtagonistValue = getSingleValue(
    searchParams.bookProtagonist,
  ).trim();
  const videoFilterValue = getSingleValue(searchParams.videoFilter).trim();
  const videoCategoryValue = getSingleValue(searchParams.videoCategory).trim();
  const videoPlatformValue = getSingleValue(searchParams.videoPlatform).trim();
  const [gallery, concerts, cds, books, videos, isUploaderUnlocked] =
    await Promise.all([
      getPhotoGallery({
        page: parsePage(searchParams.page),
        filterField: "all",
        filterValue,
        peopleGroup,
      }),
      getConcertList({
        filterValue: concertFilterValue,
        yearValue: concertYearValue,
        cityValue: concertCityValue,
        groupValue: concertGroupValue,
      }),
      getCdList({
        filterValue: cdFilterValue,
        groupValue: cdGroupValue,
        yearValue: cdYearValue,
        spotifyValue: cdSpotifyValue,
      }),
      getBookList({
        filterValue: bookFilterValue,
        categoryValue: bookCategoryValue,
        protagonistValue: bookProtagonistValue,
      }),
      getVideoList({
        filterValue: videoFilterValue,
        categoryValue: videoCategoryValue,
        platformValue: videoPlatformValue,
      }),
      isAdminAuthenticated(),
    ]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/6 px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.25)] backdrop-blur md:px-10 md:py-10">
          <div className="space-y-6">
            <div className="space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-300/85">
                Personal Web
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Cositas que me molan...
                </h1>
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="Accesos rápidos"
          className="sticky top-4 z-20 rounded-[2rem] border border-white/10 bg-slate-950/55 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SECTION_SHORTCUTS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
              >
                <span className="space-y-1">
                  <span className="block text-[0.68rem] uppercase tracking-[0.28em] text-cyan-300/80">
                    {item.eyebrow}
                  </span>
                  <span className="block text-base font-semibold text-white">
                    {item.label}
                  </span>
                </span>
                <span className="text-xl text-cyan-200 transition group-hover:translate-x-1">
                  →
                </span>
              </a>
            ))}
          </div>
        </nav>

        <div id="fotos" className="scroll-mt-32">
          <PhotoViewer
            photos={gallery.photos}
            configured={gallery.configured}
            error={gallery.error}
            totalCount={gallery.totalCount}
            loadedCount={gallery.loadedCount}
            currentPage={gallery.currentPage}
            totalPages={gallery.totalPages}
            pageSize={gallery.pageSize}
            filterValue={gallery.filterValue}
            peopleGroup={gallery.peopleGroup}
            initiallyUnlocked={isUploaderUnlocked}
          />
        </div>

        <div id="conciertos" className="scroll-mt-32">
          <ConcertsViewer
            concerts={concerts.concerts}
            configured={concerts.configured}
            error={concerts.error}
            totalCount={concerts.totalCount}
            filterValue={concerts.filterValue}
            yearValue={concerts.yearValue}
            cityValue={concerts.cityValue}
            groupValue={concerts.groupValue}
            yearOptions={concerts.yearOptions}
            cityOptions={concerts.cityOptions}
            groupOptions={concerts.groupOptions}
          />
        </div>

        <div id="cds" className="scroll-mt-32">
          <CdsViewer
            cds={cds.cds}
            configured={cds.configured}
            error={cds.error}
            totalCount={cds.totalCount}
            filterValue={cds.filterValue}
            groupValue={cds.groupValue}
            yearValue={cds.yearValue}
            spotifyValue={cds.spotifyValue}
            groupOptions={cds.groupOptions}
            yearOptions={cds.yearOptions}
          />
        </div>

        <div id="libros" className="scroll-mt-32">
          <BooksViewer
            books={books.books}
            configured={books.configured}
            error={books.error}
            totalCount={books.totalCount}
            filterValue={books.filterValue}
            categoryValue={books.categoryValue}
            protagonistValue={books.protagonistValue}
            categoryOptions={books.categoryOptions}
            protagonistOptions={books.protagonistOptions}
          />
        </div>

        <div id="videos" className="scroll-mt-32">
          <VideosViewer
            videos={videos.videos}
            configured={videos.configured}
            error={videos.error}
            totalCount={videos.totalCount}
            filterValue={videos.filterValue}
            categoryValue={videos.categoryValue}
            platformValue={videos.platformValue}
            categoryOptions={videos.categoryOptions}
            platformOptions={videos.platformOptions}
          />
        </div>
      </div>
    </main>
  );
}

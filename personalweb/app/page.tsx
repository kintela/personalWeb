import { CdsViewer } from "@/components/cds-viewer";
import { BooksViewer } from "@/components/books-viewer";
import { ConcertsViewer } from "@/components/concerts-viewer";
import { DeepLinkFocus } from "@/components/deep-link-focus";
import { GuitarViewer } from "@/components/guitar-viewer";
import { HistoryViewer } from "@/components/history-viewer";
import { PhotoViewer } from "@/components/photo-viewer";
import { SpotifyViewer } from "@/components/spotify-viewer";
import { VinilosViewer } from "@/components/vinilos-viewer";
import { VideosViewer } from "@/components/videos-viewer";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  normalizePhotoFilterValue,
  normalizePhotoPeopleGroup,
} from "@/lib/photo-filters";
import { getCdList } from "@/lib/supabase/cds";
import { getBookList } from "@/lib/supabase/books";
import { getConcertList } from "@/lib/supabase/concerts";
import { getGuitarTopicList } from "@/lib/supabase/guitar-topics";
import { getPhotoGallery } from "@/lib/supabase/photos";
import { getViniloList } from "@/lib/supabase/vinilos";
import {
  getGuitarVideoList,
  getHistoryVideoList,
  getVideoList,
} from "@/lib/supabase/videos";
import { getSpotifyPlaylistList } from "@/lib/spotify";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SECTION_SHORTCUTS = [
  {
    href: "#spotify",
    label: "Spotify",
    eyebrow: "Playlists",
  },
  {
    href: "#fotos",
    label: "Fotos",
    eyebrow: "PhotoTeka",
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
    href: "#vinilos",
    label: "Vinilos",
    eyebrow: "Portadas",
  },
  {
    href: "#libros",
    label: "Libros",
    eyebrow: "Lecturas",
  },
  {
    href: "#historia",
    label: "Historia",
    eyebrow: "Archivo",
  },
  {
    href: "#guitarra",
    label: "Guitarra",
    eyebrow: "Cuerdas",
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
  const guitarGroupValue = getSingleValue(searchParams.guitarGroup).trim();
  const guitarThemeValue = getSingleValue(searchParams.guitarTheme).trim();
  const spotifyFilterValue = getSingleValue(searchParams.spotifyFilter).trim();
  const videoFilterValue = getSingleValue(searchParams.videoFilter).trim();
  const videoCategoryValue = getSingleValue(searchParams.videoCategory).trim();
  const videoPlatformValue = getSingleValue(searchParams.videoPlatform).trim();
  const [
    gallery,
    concerts,
    cds,
    vinilos,
    books,
    historyVideos,
    guitarVideos,
    guitarTopics,
    spotifyPlaylists,
    videos,
    isUploaderUnlocked,
  ] = await Promise.all([
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
      getViniloList(),
      getBookList({
        filterValue: bookFilterValue,
        categoryValue: bookCategoryValue,
        protagonistValue: bookProtagonistValue,
      }),
      getHistoryVideoList(),
      getGuitarVideoList(),
      getGuitarTopicList({
        groupValue: guitarGroupValue,
        topicValue: guitarThemeValue,
      }),
      getSpotifyPlaylistList(),
      getVideoList({
        filterValue: videoFilterValue,
        categoryValue: videoCategoryValue,
        platformValue: videoPlatformValue,
      }),
      isAdminAuthenticated(),
    ]);

  return (
    <main className="min-h-screen">
      <DeepLinkFocus />
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
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          className="sticky z-20 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur sm:rounded-[2rem]"
        >
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] sm:grid sm:overflow-visible sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
            {SECTION_SHORTCUTS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex min-w-[12.5rem] shrink-0 items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 sm:min-w-0 sm:rounded-[1.4rem]"
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

        <div id="vinilos" className="scroll-mt-32">
          <VinilosViewer
            vinilos={vinilos.vinilos}
            configured={vinilos.configured}
            error={vinilos.error}
            totalCount={vinilos.totalCount}
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

        <div id="historia" className="scroll-mt-32">
          <HistoryViewer
            videos={historyVideos.videos}
            configured={historyVideos.configured}
            error={historyVideos.error}
            totalCount={historyVideos.totalCount}
          />
        </div>

        <div id="guitarra" className="scroll-mt-32">
          <GuitarViewer
            videos={guitarVideos.videos}
            topics={guitarTopics.topics}
            configured={guitarVideos.configured && guitarTopics.configured}
            error={guitarVideos.error ?? guitarTopics.error}
            generalVideoCount={guitarVideos.totalCount}
            totalVideoCount={guitarTopics.totalVideoCount}
            totalTopicCount={guitarTopics.totalTopicCount}
            totalGroupCount={guitarTopics.totalGroupCount}
            groupValue={guitarTopics.groupValue}
            topicValue={guitarTopics.topicValue}
            groupOptions={guitarTopics.groupOptions}
            topicOptions={guitarTopics.topicOptions}
          />
        </div>

        <div id="spotify" className="scroll-mt-32">
          <SpotifyViewer
            playlists={spotifyPlaylists.playlists}
            quickAccess={spotifyPlaylists.quickAccess}
            configured={spotifyPlaylists.configured}
            connected={spotifyPlaylists.connected}
            error={spotifyPlaylists.error}
            accountName={spotifyPlaylists.accountName}
            loginHref={spotifyPlaylists.loginHref}
            callbackPath={spotifyPlaylists.callbackPath}
            filterValue={spotifyFilterValue}
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

import { PhotoPeopleList } from "@/components/photo-people-list";
import { PhotoViewer } from "@/components/photo-viewer";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  normalizePhotoFilterValue,
  normalizePhotoPeopleGroup,
} from "@/lib/photo-filters";
import { getPhotoGallery, getPhotoPeopleList } from "@/lib/supabase/photos";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const [gallery, peopleList, isUploaderUnlocked] = await Promise.all([
    getPhotoGallery({
      page: parsePage(searchParams.page),
      filterField: "all",
      filterValue,
      peopleGroup,
    }),
    getPhotoPeopleList(),
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

        <PhotoPeopleList
          people={peopleList.people}
          configured={peopleList.configured}
          error={peopleList.error}
          totalPeople={peopleList.totalPeople}
          totalAppearances={peopleList.totalAppearances}
        />
      </div>
    </main>
  );
}

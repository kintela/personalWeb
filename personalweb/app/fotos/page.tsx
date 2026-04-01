import type { Metadata } from "next";
import { PhotoViewer } from "@/components/photo-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  normalizePhotoFilterValue,
  normalizePhotoPeopleGroup,
} from "@/lib/photo-filters";
import {
  getSingleSearchParam,
  parsePositivePageParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getPhotoGallery } from "@/lib/supabase/photos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/fotos");

export default async function FotosPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const filterValue = normalizePhotoFilterValue(
    getSingleSearchParam(searchParams.filterValue),
  );
  const peopleGroup = normalizePhotoPeopleGroup(
    getSingleSearchParam(searchParams.peopleGroup),
  );
  const [gallery, isUploaderUnlocked] = await Promise.all([
    getPhotoGallery({
      page: parsePositivePageParam(searchParams.page),
      filterField: "all",
      filterValue,
      peopleGroup,
    }),
    isAdminAuthenticated(),
  ]);

  return (
    <SectionPageShell currentHref="/fotos">
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
    </SectionPageShell>
  );
}

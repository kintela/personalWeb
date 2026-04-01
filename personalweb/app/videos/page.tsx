import type { Metadata } from "next";
import { VideosViewer } from "@/components/videos-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getVideoList } from "@/lib/supabase/videos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/videos");

export default async function VideosPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const videos = await getVideoList({
    filterValue: getSingleSearchParam(searchParams.videoFilter).trim(),
    categoryValue: getSingleSearchParam(searchParams.videoCategory).trim(),
    platformValue: getSingleSearchParam(searchParams.videoPlatform).trim(),
  });

  return (
    <SectionPageShell currentHref="/videos">
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
    </SectionPageShell>
  );
}

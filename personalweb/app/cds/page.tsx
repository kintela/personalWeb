import type { Metadata } from "next";
import { CdsViewer } from "@/components/cds-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getCdList } from "@/lib/supabase/cds";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/cds");

export default async function CdsPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const cds = await getCdList({
    filterValue: getSingleSearchParam(searchParams.cdFilter).trim(),
    groupValue: getSingleSearchParam(searchParams.cdGroup).trim(),
    yearValue: getSingleSearchParam(searchParams.cdYear).trim(),
    spotifyValue: getSingleSearchParam(searchParams.cdSpotify).trim(),
  });

  return (
    <SectionPageShell currentHref="/cds">
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
    </SectionPageShell>
  );
}

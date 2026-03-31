import { ConcertsViewer } from "@/components/concerts-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getConcertList } from "@/lib/supabase/concerts";

export const dynamic = "force-dynamic";

export default async function ConciertosPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const concerts = await getConcertList({
    filterValue: getSingleSearchParam(searchParams.concertFilter).trim(),
    yearValue: getSingleSearchParam(searchParams.concertYear).trim(),
    cityValue: getSingleSearchParam(searchParams.concertCity).trim(),
    groupValue: getSingleSearchParam(searchParams.concertGroup).trim(),
  });

  return (
    <SectionPageShell currentHref="/conciertos">
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
    </SectionPageShell>
  );
}

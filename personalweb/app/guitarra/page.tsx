import type { Metadata } from "next";
import { GuitarViewer } from "@/components/guitar-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getGuitarTopicList } from "@/lib/supabase/guitar-topics";
import { getGuitarVideoList } from "@/lib/supabase/videos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/guitarra");

export default async function GuitarraPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const [guitarVideos, guitarTopics] = await Promise.all([
    getGuitarVideoList(),
    getGuitarTopicList({
      groupValue: getSingleSearchParam(searchParams.guitarGroup).trim(),
      topicValue: getSingleSearchParam(searchParams.guitarTheme).trim(),
    }),
  ]);

  return (
    <SectionPageShell currentHref="/guitarra">
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
    </SectionPageShell>
  );
}

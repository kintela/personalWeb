import { MtvViewer } from "@/components/mtv-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { getRankedYouTubeVideoList } from "@/lib/supabase/youtube-match-cache";

export const dynamic = "force-dynamic";

export default async function MtvPage() {
  const mtvVideos = await getRankedYouTubeVideoList();

  return (
    <SectionPageShell currentHref="/mtv">
      <MtvViewer
        videos={mtvVideos.videos}
        configured={mtvVideos.configured}
        error={mtvVideos.error}
        totalCount={mtvVideos.totalCount}
      />
    </SectionPageShell>
  );
}

import { HistoryViewer } from "@/components/history-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { getHistoryVideoList } from "@/lib/supabase/videos";

export const dynamic = "force-dynamic";

export default async function HistoriaPage() {
  const historyVideos = await getHistoryVideoList();

  return (
    <SectionPageShell currentHref="/historia">
      <HistoryViewer
        videos={historyVideos.videos}
        configured={historyVideos.configured}
        error={historyVideos.error}
        totalCount={historyVideos.totalCount}
      />
    </SectionPageShell>
  );
}

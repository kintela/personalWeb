import type { Metadata } from "next";
import { DiscosViewer } from "@/components/discos-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getDiscoList } from "@/lib/supabase/discos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/discos");

export default async function DiscosPage() {
  const discos = await getDiscoList();

  return (
    <SectionPageShell currentHref="/discos">
      <DiscosViewer
        discos={discos.discos}
        configured={discos.configured}
        error={discos.error}
        totalCount={discos.totalCount}
        yearObservations={discos.yearObservations}
      />
    </SectionPageShell>
  );
}

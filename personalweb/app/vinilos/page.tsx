import type { Metadata } from "next";
import { VinilosViewer } from "@/components/vinilos-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getViniloList } from "@/lib/supabase/vinilos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/vinilos");

export default async function VinilosPage() {
  const vinilos = await getViniloList();

  return (
    <SectionPageShell currentHref="/vinilos">
      <VinilosViewer
        vinilos={vinilos.vinilos}
        configured={vinilos.configured}
        error={vinilos.error}
        totalCount={vinilos.totalCount}
      />
    </SectionPageShell>
  );
}

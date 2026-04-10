import type { Metadata } from "next";
import { InstagramViewer } from "@/components/instagram-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { getInstagramFeed } from "@/lib/instagram";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/instagram");

export default async function InstagramPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const instagramFeed = await getInstagramFeed();

  return (
    <SectionPageShell currentHref="/instagram">
      <InstagramViewer
        profile={instagramFeed.profile}
        media={instagramFeed.media}
        configured={instagramFeed.configured}
        connected={instagramFeed.connected}
        error={instagramFeed.error}
        accountName={instagramFeed.accountName}
        loginHref={instagramFeed.loginHref}
        callbackPath={instagramFeed.callbackPath}
        filterValue={getSingleSearchParam(searchParams.instagramFilter).trim()}
      />
    </SectionPageShell>
  );
}

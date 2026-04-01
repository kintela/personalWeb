import type { Metadata } from "next";
import { SpotifyViewer } from "@/components/spotify-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getSpotifyPlaylistList } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/spotify");

export default async function SpotifyPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const [spotifyPlaylists, isUploaderUnlocked] = await Promise.all([
    getSpotifyPlaylistList(),
    isAdminAuthenticated(),
  ]);

  return (
    <SectionPageShell currentHref="/spotify">
      <SpotifyViewer
        playlists={spotifyPlaylists.playlists}
        quickAccess={spotifyPlaylists.quickAccess}
        configured={spotifyPlaylists.configured}
        connected={spotifyPlaylists.connected}
        error={spotifyPlaylists.error}
        accountName={spotifyPlaylists.accountName}
        loginHref={spotifyPlaylists.loginHref}
        callbackPath={spotifyPlaylists.callbackPath}
        filterValue={getSingleSearchParam(searchParams.spotifyFilter).trim()}
        initiallyAdminUnlocked={isUploaderUnlocked}
      />
    </SectionPageShell>
  );
}

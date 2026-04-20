import type { Metadata } from "next";
import { DiscosViewer } from "@/components/discos-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import type { SpotifyPlaylistAsset } from "@/lib/spotify-types";
import { getSpotifyPlaylistList } from "@/lib/spotify";
import { getDiscoGroupOptions, getDiscoList } from "@/lib/supabase/discos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/discos");

function buildYearSpotifyPlaylists(
  years: string[],
  playlists: SpotifyPlaylistAsset[],
) {
  const yearSpotifyPlaylists: Record<
    string,
    {
      name: string;
      externalUrl: string;
      trackCount: number;
    }
  > = {};

  for (const year of years) {
    const matchedPlaylist =
      playlists.find((playlist) => playlist.name.trim() === year) ?? null;

    if (!matchedPlaylist) {
      continue;
    }

    yearSpotifyPlaylists[year] = {
      name: matchedPlaylist.name,
      externalUrl: matchedPlaylist.externalUrl,
      trackCount: matchedPlaylist.trackCount,
    };
  }

  return yearSpotifyPlaylists;
}

export default async function DiscosPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const [discos, initiallyAdminUnlocked, spotifyPlaylists, discoGroupOptions] =
    await Promise.all([
      getDiscoList({
        filterValue: getSingleSearchParam(searchParams.discoFilter).trim(),
        yearValue: getSingleSearchParam(searchParams.discoYear).trim(),
      }),
      isAdminAuthenticated(),
      getSpotifyPlaylistList(),
      getDiscoGroupOptions(),
    ]);
  const discoYears = [
    ...new Set(
      discos.discos
        .map((disco) => (Number.isInteger(disco.year) ? String(disco.year) : ""))
        .filter(Boolean),
    ),
  ];
  const yearSpotifyPlaylists = buildYearSpotifyPlaylists(
    discoYears,
    spotifyPlaylists.playlists,
  );

  return (
    <SectionPageShell currentHref="/discos">
      <DiscosViewer
        discos={discos.discos}
        configured={discos.configured}
        error={discos.error}
        totalCount={discos.totalCount}
        filterValue={discos.filterValue}
        yearValue={discos.yearValue}
        yearOptions={discos.yearOptions}
        yearObservations={discos.yearObservations}
        adminConfigured={isAdminConfigured()}
        initiallyAdminUnlocked={initiallyAdminUnlocked}
        yearSpotifyPlaylists={yearSpotifyPlaylists}
        groupOptions={discoGroupOptions}
      />
    </SectionPageShell>
  );
}

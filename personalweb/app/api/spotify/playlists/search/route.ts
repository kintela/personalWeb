import { NextResponse } from "next/server";
import {
  searchSpotifyOwnedPlaylistsByTrackQuery,
  searchSpotifyOwnedTracksByQuery,
} from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const [hits, tracks] = await Promise.all([
      searchSpotifyOwnedPlaylistsByTrackQuery(query),
      searchSpotifyOwnedTracksByQuery(query),
    ]);

    return NextResponse.json({ hits, tracks });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido buscar temas dentro de las playlists.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

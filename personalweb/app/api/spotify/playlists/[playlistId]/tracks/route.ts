import { NextResponse } from "next/server";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { playlistId } = await context.params;

  try {
    const tracks = await getSpotifyPlaylistTracks(playlistId);

    return NextResponse.json({ tracks });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido leer las canciones de esta playlist.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

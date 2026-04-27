import { NextResponse } from "next/server";
import { searchSpotifyCachedPlaylistsByTrackQuery } from "@/lib/supabase/spotify-cache";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query || query.length < 4) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const hits = await searchSpotifyCachedPlaylistsByTrackQuery(query);

    return NextResponse.json({ hits });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido buscar temas dentro de las playlists.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

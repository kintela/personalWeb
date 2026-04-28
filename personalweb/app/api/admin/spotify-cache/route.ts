import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { syncSpotifyOwnedPlaylistCache } from "@/lib/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Necesitas una sesión admin para sincronizar Spotify." },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      force?: unknown;
      playlistId?: unknown;
    };
    const force = payload.force === true;
    const playlistId =
      typeof payload.playlistId === "string" && payload.playlistId.trim()
        ? payload.playlistId.trim()
        : undefined;

    const result = await syncSpotifyOwnedPlaylistCache({ force, playlistId });

    return NextResponse.json(result, {
      status: result.rateLimited ? 429 : result.ok ? 200 : 500,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido sincronizar la cache de Spotify.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { syncSpotifyOwnedPlaylistCache } from "@/lib/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";
    const playlistId = searchParams.get("playlistId")?.trim() || undefined;

    await syncSpotifyOwnedPlaylistCache({ force, playlistId });

    return NextResponse.json({
      ok: true,
      force,
      playlistId: playlistId ?? null,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido sincronizar la cache de Spotify.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

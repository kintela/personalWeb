import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  getSpotifyPlaylistTracks,
  invalidateSpotifyPlaylistListCache,
} from "@/lib/spotify";
import {
  updateSpotifyCachedPlaylistTrackLanguage,
  updateSpotifyCachedPlaylistTrackWomenPower,
} from "@/lib/supabase/spotify-cache";

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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesitas desbloquear la sesión admin para guardar el idioma.",
      },
      { status: 401 },
    );
  }

  const { playlistId } = await context.params;
  const { position, languageCode, womenPower } = (await request.json().catch(() => ({}))) as {
    position?: number;
    languageCode?: string | null;
    womenPower?: boolean;
  };
  const normalizedPosition = Number.parseInt(String(position ?? ""), 10);

  if (!playlistId.trim() || !Number.isInteger(normalizedPosition) || normalizedPosition <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesito playlist y posición para actualizar el idioma.",
      },
      { status: 400 },
    );
  }

  const isWomenPowerUpdate = typeof womenPower === "boolean";
  const result = isWomenPowerUpdate
    ? await updateSpotifyCachedPlaylistTrackWomenPower({
        playlistSpotifyId: playlistId,
        position: normalizedPosition,
        womenPower,
      })
    : await updateSpotifyCachedPlaylistTrackLanguage({
        playlistSpotifyId: playlistId,
        position: normalizedPosition,
        languageCode: languageCode ?? null,
      });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
      },
      { status: 500 },
    );
  }

  invalidateSpotifyPlaylistListCache();

  return NextResponse.json(result);
}

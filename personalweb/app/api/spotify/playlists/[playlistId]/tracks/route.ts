import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSpotifyPlaylistTracks } from "@/lib/spotify";
import { updateSpotifyCachedPlaylistTrackLanguage } from "@/lib/supabase/spotify-cache";

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
  const { position, languageCode } = (await request.json().catch(() => ({}))) as {
    position?: number;
    languageCode?: string | null;
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

  const result = await updateSpotifyCachedPlaylistTrackLanguage({
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

  return NextResponse.json({
    ok: true,
    languageCode: result.languageCode,
  });
}

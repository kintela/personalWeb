import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { saveManualYouTubeSongVideo, searchYouTubeSongVideo } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const trackName = requestUrl.searchParams.get("track")?.trim() ?? "";
  const artistsLabel = requestUrl.searchParams.get("artists")?.trim() ?? "";
  const albumName = requestUrl.searchParams.get("album")?.trim() ?? "";
  const albumReleaseYear = requestUrl.searchParams.get("year")?.trim() ?? "";

  if (!trackName || !artistsLabel) {
    return NextResponse.json(
      { error: "Faltan track o artists para buscar en YouTube." },
      { status: 400 },
    );
  }

  try {
    const video = await searchYouTubeSongVideo({
      trackName,
      artistsLabel,
      albumName: albumName || null,
      albumReleaseYear: albumReleaseYear || null,
    });

    return NextResponse.json({ video });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido buscar el vídeo en YouTube.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesitas desbloquear la sesión admin para guardar un vídeo manual.",
      },
      { status: 401 },
    );
  }

  const {
    track,
    artists,
    album,
    year,
    youtubeUrl,
  } = (await request.json().catch(() => ({}))) as {
    track?: string;
    artists?: string;
    album?: string;
    year?: string;
    youtubeUrl?: string;
  };

  const trackName = String(track ?? "").trim();
  const artistsLabel = String(artists ?? "").trim();
  const albumName = String(album ?? "").trim();
  const albumReleaseYear = String(year ?? "").trim();
  const manualYoutubeUrl = String(youtubeUrl ?? "").trim();

  if (!trackName || !artistsLabel || !manualYoutubeUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesito tema, artistas y enlace de YouTube para guardar el vídeo manual.",
      },
      { status: 400 },
    );
  }

  try {
    const video = await saveManualYouTubeSongVideo({
      trackName,
      artistsLabel,
      albumName: albumName || null,
      albumReleaseYear: albumReleaseYear || null,
      videoUrl: manualYoutubeUrl,
    });

    return NextResponse.json({
      ok: true,
      video,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido guardar el vídeo manual en la caché.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

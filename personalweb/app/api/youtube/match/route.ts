import { NextResponse } from "next/server";
import { searchYouTubeSongVideo } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const trackName = requestUrl.searchParams.get("track")?.trim() ?? "";
  const artistsLabel = requestUrl.searchParams.get("artists")?.trim() ?? "";

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

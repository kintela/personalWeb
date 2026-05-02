import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  inferTrackLanguageFromText,
  isOpenAiLanguageInferenceConfigured,
} from "@/lib/openai-language";
import {
  readSpotifyCachedPlaylistTrackByPosition,
  updateSpotifyCachedPlaylistTrackLanguage,
} from "@/lib/supabase/spotify-cache";
import { readYouTubeMatchCacheDetails } from "@/lib/supabase/youtube-match-cache";
import { getYouTubeSongVideoCacheKey } from "@/lib/youtube";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    playlistId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesitas desbloquear la sesión admin para inferir el idioma.",
      },
      { status: 401 },
    );
  }

  if (!isOpenAiLanguageInferenceConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta OPENAI_API_KEY para inferir el idioma con IA.",
      },
      { status: 500 },
    );
  }

  const { playlistId } = await context.params;
  const { position } = (await request.json().catch(() => ({}))) as {
    position?: number;
  };
  const normalizedPosition = Number.parseInt(String(position ?? ""), 10);

  if (!playlistId.trim() || !Number.isInteger(normalizedPosition) || normalizedPosition <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Necesito playlist y posición para inferir el idioma.",
      },
      { status: 400 },
    );
  }

  const track = await readSpotifyCachedPlaylistTrackByPosition({
    playlistSpotifyId: playlistId,
    position: normalizedPosition,
  });

  if (!track) {
    return NextResponse.json(
      {
        ok: false,
        error: "No he encontrado la pista cacheada para inferir el idioma.",
      },
      { status: 404 },
    );
  }

  if (track.languageCode) {
    return NextResponse.json({
      ok: true,
      languageCode: track.languageCode,
      confidence: 1,
      reason: "La pista ya tenía idioma guardado, así que no he ejecutado la inferencia.",
      skipped: true,
    });
  }

  const cacheKey = getYouTubeSongVideoCacheKey({
    trackName: track.name,
    artistsLabel: track.artistsLabel,
    albumName: track.albumName,
    albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
  });
  const cachedVideo = await readYouTubeMatchCacheDetails(cacheKey);

  if (!cachedVideo?.video) {
    return NextResponse.json(
      {
        ok: false,
        error: "Esta pista no tiene un vídeo de YouTube cacheado utilizable para inferir el idioma.",
      },
      { status: 404 },
    );
  }

  try {
    const inference = await inferTrackLanguageFromText({
      trackName: track.name,
      artistsLabel: track.artistsLabel,
      albumName: track.albumName,
      albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
      youtubeTitle: cachedVideo.video.title,
      youtubeDescription: cachedVideo.video.description,
      youtubeChannelTitle: cachedVideo.video.channelTitle,
      matchedQuery: cachedVideo.matchedQuery,
    });

    if (inference.languageCode !== "es" && inference.languageCode !== "en") {
      return NextResponse.json({
        ok: true,
        languageCode: null,
        confidence: inference.confidence,
        reason: inference.reason,
        inferredLanguageCode: inference.languageCode,
        saved: false,
      });
    }

    const updateResult = await updateSpotifyCachedPlaylistTrackLanguage({
      playlistSpotifyId: playlistId,
      position: normalizedPosition,
      languageCode: inference.languageCode,
    });

    if (!updateResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: updateResult.error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      languageCode: updateResult.languageCode,
      confidence: inference.confidence,
      reason: inference.reason,
      inferredLanguageCode: inference.languageCode,
      saved: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No he podido inferir el idioma de la pista.",
      },
      { status: 500 },
    );
  }
}

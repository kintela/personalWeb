import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  inferTrackLanguageFromText,
  isOpenAiLanguageInferenceConfigured,
} from "@/lib/openai-language";
import {
  readSpotifyCachedPlaylistTracks,
  updateSpotifyCachedPlaylistTrackLanguage,
  updateSpotifyCachedPlaylistTrackLanguagesForPlaylist,
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
        error: "Necesitas desbloquear la sesión admin para aplicar idiomas en lote.",
      },
      { status: 401 },
    );
  }

  const { playlistId } = await context.params;
  const { action } = (await request.json().catch(() => ({}))) as {
    action?: string;
  };
  const normalizedPlaylistId = playlistId.trim();

  if (!normalizedPlaylistId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta la playlist de Spotify.",
      },
      { status: 400 },
    );
  }

  if (action === "set-es") {
    const result = await updateSpotifyCachedPlaylistTrackLanguagesForPlaylist({
      playlistSpotifyId: normalizedPlaylistId,
      languageCode: "es",
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
      action,
      affectedCount: result.affectedCount,
    });
  }

  if (action !== "infer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Acción de lote no soportada.",
      },
      { status: 400 },
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

  const tracks = await readSpotifyCachedPlaylistTracks(normalizedPlaylistId);
  const pendingTracks = tracks.filter((track) => !track.languageCode);

  const summary = {
    processedCount: 0,
    savedEsCount: 0,
    savedEnCount: 0,
    unknownCount: 0,
    instrumentalCount: 0,
    missingVideoCount: 0,
    skippedExistingCount: tracks.length - pendingTracks.length,
    errorCount: 0,
  };

  for (const track of pendingTracks) {
    summary.processedCount += 1;

    const cacheKey = getYouTubeSongVideoCacheKey({
      trackName: track.name,
      artistsLabel: track.artistsLabel,
      albumName: track.albumName,
      albumReleaseYear: track.albumReleaseDate?.slice(0, 4) ?? null,
    });
    const cachedVideo = await readYouTubeMatchCacheDetails(cacheKey);

    if (!cachedVideo?.video) {
      summary.missingVideoCount += 1;
      continue;
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

      if (inference.languageCode === "es" || inference.languageCode === "en") {
        const updateResult = await updateSpotifyCachedPlaylistTrackLanguage({
          playlistSpotifyId: normalizedPlaylistId,
          position: track.position,
          languageCode: inference.languageCode,
        });

        if (!updateResult.ok) {
          summary.errorCount += 1;
          continue;
        }

        if (inference.languageCode === "es") {
          summary.savedEsCount += 1;
        } else {
          summary.savedEnCount += 1;
        }

        continue;
      }

      if (inference.languageCode === "instrumental") {
        summary.instrumentalCount += 1;
      } else {
        summary.unknownCount += 1;
      }
    } catch {
      summary.errorCount += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    ...summary,
  });
}

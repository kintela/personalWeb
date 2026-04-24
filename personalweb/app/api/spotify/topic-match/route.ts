import { findSpotifyTopicMatchInOwnedPlaylists } from "@/lib/spotify";
import {
  getStoredGuitarTopicSpotifyUrl,
  updateGuitarTopicSpotifyUrl,
} from "@/lib/supabase/guitar-topics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId")?.trim() ?? "";
  const topicName = searchParams.get("topicName")?.trim() ?? "";
  const groupName = searchParams.get("groupName")?.trim() ?? "";

  if (!topicName || !groupName) {
    return Response.json(
      {
        ok: false,
        error: "Faltan el nombre del tema o del grupo.",
        spotifyUrl: null,
      },
      { status: 400 },
    );
  }

  if (topicId) {
    const storedSpotify = await getStoredGuitarTopicSpotifyUrl(topicId);

    if (storedSpotify.spotifyUrl) {
      return Response.json({
        ok: true,
        error: null,
        spotifyUrl: storedSpotify.spotifyUrl,
      });
    }
  }

  const match = await findSpotifyTopicMatchInOwnedPlaylists({
    topicName,
    groupName,
  });
  const spotifyUrl = match?.trackExternalUrl ?? null;

  if (spotifyUrl && topicId) {
    const updateResult = await updateGuitarTopicSpotifyUrl({
      topicId,
      spotifyUrl,
    });

    if (!updateResult.ok && updateResult.error) {
      console.warn(
        `[spotify-topic-match] No he podido guardar el enlace del tema ${topicId}: ${updateResult.error}`,
      );
    }
  }

  return Response.json({
    ok: true,
    error: null,
    spotifyUrl,
  });
}

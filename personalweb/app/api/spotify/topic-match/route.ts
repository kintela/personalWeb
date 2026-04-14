import { findSpotifyTopicMatchInOwnedPlaylists } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicName = searchParams.get("topicName")?.trim() ?? "";
  const groupName = searchParams.get("groupName")?.trim() ?? "";

  if (!topicName || !groupName) {
    return Response.json(
      {
        ok: false,
        error: "Faltan el nombre del tema o del grupo.",
        match: null,
      },
      { status: 400 },
    );
  }

  const match = await findSpotifyTopicMatchInOwnedPlaylists({
    topicName,
    groupName,
  });

  return Response.json({
    ok: true,
    error: null,
    match,
  });
}

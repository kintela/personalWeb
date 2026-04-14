import { getGuitarTopicTablatureImages } from "@/lib/supabase/guitar-topics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId")?.trim() ?? "";

  if (!topicId) {
    return Response.json(
      {
        ok: false,
        error: "Falta el identificador del tema.",
        images: [],
      },
      { status: 400 },
    );
  }

  const result = await getGuitarTopicTablatureImages(topicId);

  return Response.json({
    ok: !result.error,
    error: result.error,
    images: result.images,
  });
}

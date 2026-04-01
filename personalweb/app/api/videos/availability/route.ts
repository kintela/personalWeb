import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { updateVideoAvailability } from "@/lib/supabase/videos";

export const runtime = "nodejs";

function jsonResponse(
  body: Record<string, string | boolean>,
  status = 200,
) {
  return NextResponse.json(body, { status });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas una sesión admin para cambiar la disponibilidad.",
      },
      401,
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    id?: number | string;
    available?: boolean;
  };
  const videoId = Number.parseInt(String(payload.id ?? ""), 10);

  if (!Number.isInteger(videoId) || videoId <= 0) {
    return jsonResponse(
      {
        ok: false,
        error: "El id del vídeo no es válido.",
      },
      400,
    );
  }

  if (typeof payload.available !== "boolean") {
    return jsonResponse(
      {
        ok: false,
        error: "El estado de disponibilidad no es válido.",
      },
      400,
    );
  }

  const result = await updateVideoAvailability({
    id: videoId,
    available: payload.available,
  });

  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.error,
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    available: result.available,
  });
}

import { createClient } from "@supabase/supabase-js";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";

type ObservationPayload = {
  entries?: Array<{
    yearPublicacion?: number;
    observaciones?: string;
  }>;
};

function jsonResponse(
  body: Record<string, string | boolean | number>,
  status = 200,
) {
  return Response.json(body, { status });
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

function normalizeEntries(payload: ObservationPayload) {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const dedupedEntries = new Map<number, string>();

  for (const entry of entries) {
    const yearValue = Number(entry?.yearPublicacion);
    const observationValue = String(entry?.observaciones ?? "").trim();

    if (!Number.isInteger(yearValue)) {
      throw new Error("Cada observación tiene que incluir un año válido.");
    }

    if (yearValue < 1900 || yearValue > 2100) {
      throw new Error(`El año ${yearValue} queda fuera del rango permitido.`);
    }

    dedupedEntries.set(yearValue, observationValue);
  }

  return [...dedupedEntries.entries()].map(([yearPublicacion, observaciones]) => ({
    year_publicacion: yearPublicacion,
    observaciones,
  }));
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas desbloquear la sesión admin para guardar observaciones.",
      },
      401,
    );
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        ok: false,
        error: "Faltan variables de entorno de Supabase en el servidor.",
      },
      500,
    );
  }

  let normalizedEntries;

  try {
    const payload = (await request.json().catch(() => ({ entries: [] }))) as ObservationPayload;
    normalizedEntries = normalizeEntries(payload);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "El formato enviado no es válido.",
      },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const entriesToUpsert = normalizedEntries.filter(
    (entry) => entry.observaciones.length > 0,
  );
  const yearsToDelete = normalizedEntries
    .filter((entry) => entry.observaciones.length === 0)
    .map((entry) => entry.year_publicacion);

  if (entriesToUpsert.length > 0) {
    const { error } = await supabase
      .from("discos_year_observaciones")
      .upsert(entriesToUpsert, { onConflict: "year_publicacion" });

    if (error) {
      return jsonResponse(
        {
          ok: false,
          error: `No he podido guardar las observaciones: ${error.message}`,
        },
        500,
      );
    }
  }

  if (yearsToDelete.length > 0) {
    const { error } = await supabase
      .from("discos_year_observaciones")
      .delete()
      .in("year_publicacion", yearsToDelete);

    if (error) {
      return jsonResponse(
        {
          ok: false,
          error: `No he podido borrar observaciones vacías: ${error.message}`,
        },
        500,
      );
    }
  }

  return jsonResponse({
    ok: true,
    updatedCount: entriesToUpsert.length,
    deletedCount: yearsToDelete.length,
  });
}

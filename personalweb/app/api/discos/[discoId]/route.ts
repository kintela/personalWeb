import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { updateDiscoDetails } from "@/lib/supabase/discos";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    discoId: string;
  }>;
};

function jsonResponse(
  body: Record<string, string | boolean | number | object | null>,
  status = 200,
) {
  return NextResponse.json(body, { status });
}

function getTrimmedStringValue(value: unknown) {
  return String(value ?? "").trim();
}

function getOptionalTrimmedStringValue(value: unknown) {
  const normalizedValue = getTrimmedStringValue(value);

  return normalizedValue || null;
}

function getIntegerValue(value: unknown) {
  const normalizedValue = getTrimmedStringValue(value);

  if (!normalizedValue) {
    return Number.NaN;
  }

  return Number.parseInt(normalizedValue, 10);
}

function parseOptionalDateValue(value: unknown) {
  const normalizedValue = getTrimmedStringValue(value);

  if (!normalizedValue) {
    return {
      ok: true as const,
      value: null,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return {
      ok: false as const,
      error: "La fecha de publicación debe tener formato AAAA-MM-DD.",
    };
  }

  const [rawYear, rawMonth, rawDay] = normalizedValue.split("-");
  const yearValue = Number.parseInt(rawYear ?? "", 10);
  const monthValue = Number.parseInt(rawMonth ?? "", 10);
  const dayValue = Number.parseInt(rawDay ?? "", 10);
  const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));

  if (
    !Number.isInteger(yearValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(dayValue) ||
    date.getUTCFullYear() !== yearValue ||
    date.getUTCMonth() !== monthValue - 1 ||
    date.getUTCDate() !== dayValue
  ) {
    return {
      ok: false as const,
      error: "La fecha de publicación no es válida.",
    };
  }

  return {
    ok: true as const,
    value: normalizedValue,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdminAuthenticated())) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas una sesión admin para editar este disco.",
      },
      401,
    );
  }

  const { discoId } = await context.params;
  const id = Number.parseInt(discoId, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse(
      {
        ok: false,
        error: "El id del disco no es válido.",
      },
      400,
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    nombre?: unknown;
    yearPublicacion?: unknown;
    fechaPublicacion?: unknown;
    discografica?: unknown;
    productor?: unknown;
    estudio?: unknown;
    groupId?: unknown;
  };
  const nombre = getTrimmedStringValue(payload.nombre);
  const yearPublicacion = getIntegerValue(payload.yearPublicacion);
  const fechaPublicacion = parseOptionalDateValue(payload.fechaPublicacion);
  const discografica = getTrimmedStringValue(payload.discografica);
  const productor = getTrimmedStringValue(payload.productor);
  const estudio = getOptionalTrimmedStringValue(payload.estudio);
  const groupId = getIntegerValue(payload.groupId);

  if (!nombre || !discografica || !productor) {
    return jsonResponse(
      {
        ok: false,
        error: "Nombre, discográfica y productor son obligatorios.",
      },
      400,
    );
  }

  if (
    !Number.isInteger(yearPublicacion) ||
    yearPublicacion < 1900 ||
    yearPublicacion > 2100
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "El año de publicación debe ser un entero entre 1900 y 2100.",
      },
      400,
    );
  }

  if (!fechaPublicacion.ok) {
    return jsonResponse(
      {
        ok: false,
        error: fechaPublicacion.error,
      },
      400,
    );
  }

  if (
    fechaPublicacion.value &&
    Number.parseInt(fechaPublicacion.value.slice(0, 4), 10) !== yearPublicacion
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "La fecha de publicación debe pertenecer al mismo año indicado.",
      },
      400,
    );
  }

  if (!Number.isInteger(groupId) || groupId <= 0) {
    return jsonResponse(
      {
        ok: false,
        error: "Tienes que seleccionar un grupo válido.",
      },
      400,
    );
  }

  const result = await updateDiscoDetails({
    id,
    nombre,
    yearPublicacion,
    fechaPublicacion: fechaPublicacion.value,
    discografica,
    productor,
    estudio,
    groupId,
  });

  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.error,
      },
      result.notFound ? 404 : 500,
    );
  }

  return jsonResponse({
    ok: true,
    disco: result.disco,
  });
}

import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getPhotoBucketName } from "@/lib/supabase/photos";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 500 * 1024;
const PAGE_SIZE = 1000;
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);
const ALLOWED_ORIGINS = new Set(["Facebook", "Spotify", "Propia", "Instagram"]);

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    ""
  );
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getSupabasePublicKey();
}

function jsonResponse(
  body: Record<string, string | boolean | number | null>,
  status = 200,
) {
  return Response.json(body, { status });
}

function getStringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNullableStringValue(formData: FormData, key: string) {
  const value = getStringValue(formData, key);
  return value || null;
}

function getNullableIntegerValue(formData: FormData, key: string) {
  const rawValue = getStringValue(formData, key);

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
}

function parsePeople(rawValue: string) {
  return [...new Set(
    rawValue
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  )];
}

function extractImageNumber(fileName: string) {
  const match = fileName.match(/^(\d+)\.[^.]+$/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1] ?? "", 10);
}

async function getNextImageNumber(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
) {
  let maxNumber = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`No he podido leer el bucket "${bucket}": ${error.message}`);
    }

    for (const item of data ?? []) {
      const currentNumber = extractImageNumber(item.name);

      if (currentNumber && currentNumber > maxNumber) {
        maxNumber = currentNumber;
      }
    }

    if ((data ?? []).length < PAGE_SIZE) {
      break;
    }
  }

  return maxNumber + 1;
}

async function resolveGroupId(
  supabase: ReturnType<typeof createClient>,
  groupName: string | null,
) {
  if (!groupName) {
    return null;
  }

  const { data, error } = await supabase
    .from("grupos")
    .select("id")
    .eq("nombre", groupName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No he podido comprobar el grupo "${groupName}": ${error.message}`);
  }

  if (!data) {
    throw new Error(`El grupo "${groupName}" no existe.`);
  }

  return data.id as number;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas desbloquear el formulario con la contraseña admin.",
      },
      401,
    );
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();
  const bucket = getPhotoBucketName();

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse(
      {
        ok: false,
        error: "Faltan variables de entorno de Supabase en el servidor.",
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const formData = await request.formData();
  const file = formData.get("file");
  const title = getStringValue(formData, "title");
  const people = parsePeople(getStringValue(formData, "people"));
  const year = getNullableIntegerValue(formData, "year");
  const groupName = getNullableStringValue(formData, "groupName");
  const origin = getStringValue(formData, "origin") || "Facebook";
  const description = getNullableStringValue(formData, "description");
  const date = getNullableStringValue(formData, "date");
  const place = getNullableStringValue(formData, "place");
  const category = getNullableStringValue(formData, "category");
  const concertId = getNullableIntegerValue(formData, "concertId");

  if (!(file instanceof File)) {
    return jsonResponse({ ok: false, error: "Tienes que seleccionar una imagen." }, 400);
  }

  if (!title) {
    return jsonResponse({ ok: false, error: "El titulo es obligatorio." }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonResponse(
      {
        ok: false,
        error: "Formato de imagen no soportado. Usa JPG, PNG, WEBP, GIF o AVIF.",
      },
      400,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error: "La imagen sigue superando el limite de 500 KB tras la compresion.",
      },
      400,
    );
  }

  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(
      {
        ok: false,
        error: "Origen no valido.",
      },
      400,
    );
  }

  if (Number.isNaN(year) || Number.isNaN(concertId)) {
    return jsonResponse(
      {
        ok: false,
        error: "Anio y concierto ID deben ser numeros enteros.",
      },
      400,
    );
  }

  try {
    const nextImageNumber = await getNextImageNumber(supabase, bucket);
    const extension = ALLOWED_IMAGE_TYPES.get(file.type) ?? "jpg";
    const imageName = `${nextImageNumber}.${extension}`;
    const groupId = await resolveGroupId(supabase, groupName);
    const uploadBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(imageName, uploadBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse(
        {
          ok: false,
          error: `No he podido subir la imagen al bucket: ${uploadError.message}`,
        },
        500,
      );
    }

    const { error: insertError } = await supabase.from("fotos").insert({
      bucket,
      imagen: imageName,
      titulo: title,
      personas: people,
      anio: year,
      grupo_id: groupId,
      origen: origin,
      descripcion: description,
      fecha: date,
      lugar: place,
      categoria: category,
      concierto_id: concertId,
    });

    if (insertError) {
      await supabase.storage.from(bucket).remove([imageName]);

      return jsonResponse(
        {
          ok: false,
          error: `No he podido crear el registro en fotos: ${insertError.message}`,
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      imageName,
      imageNumber: nextImageNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ha fallado la subida de la foto.";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
}

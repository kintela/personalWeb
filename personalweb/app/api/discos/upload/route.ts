import { Buffer } from "node:buffer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  getDiscoCoverBucketName,
  getDiscoCoverFolderName,
} from "@/lib/supabase/discos";

export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
]);

function jsonResponse(
  body: Record<string, string | boolean | number | null>,
  status = 200,
) {
  return Response.json(body, { status });
}

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

function getStringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getIntegerValue(formData: FormData, key: string) {
  const rawValue = getStringValue(formData, key);

  if (!rawValue) {
    return Number.NaN;
  }

  return Number.parseInt(rawValue, 10);
}

function extractImageNumber(fileName: string) {
  const match = fileName.match(/^(\d+)\.[^.]+$/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1] ?? "", 10);
}

function inferExtension(file: File) {
  const nameMatch = file.name.toLocaleLowerCase("es-ES").match(/\.([^.]+)$/);
  const extensionFromName = nameMatch?.[1]?.trim() ?? "";

  if (ALLOWED_EXTENSIONS.has(extensionFromName)) {
    return extensionFromName;
  }

  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

async function getNextDiscoCoverNumber(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
) {
  let maxNumber = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(
        `No he podido leer la carpeta "${folder}" del bucket "${bucket}": ${error.message}`,
      );
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

async function validateGroupExists(
  supabase: SupabaseClient,
  groupId: number,
) {
  const { data, error } = await supabase
    .from("grupos")
    .select("id")
    .eq("id", groupId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No he podido comprobar el grupo ${groupId}: ${error.message}`);
  }

  if (!data) {
    throw new Error("El grupo seleccionado no existe.");
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas desbloquear la sesión admin para añadir discos.",
      },
      401,
    );
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();
  const bucket = getDiscoCoverBucketName();
  const folder = getDiscoCoverFolderName();

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
  const nombre = getStringValue(formData, "nombre");
  const yearPublicacion = getIntegerValue(formData, "year_publicacion");
  const discografica = getStringValue(formData, "discografica");
  const productor = getStringValue(formData, "productor");
  const groupId = getIntegerValue(formData, "grupo_id");

  if (!(file instanceof File)) {
    return jsonResponse(
      {
        ok: false,
        error: "Tienes que seleccionar una carátula.",
      },
      400,
    );
  }

  if (!nombre || !discografica || !productor) {
    return jsonResponse(
      {
        ok: false,
        error: "Nombre, discográfica y productor son obligatorios.",
      },
      400,
    );
  }

  if (!Number.isInteger(yearPublicacion) || yearPublicacion < 1900 || yearPublicacion > 2100) {
    return jsonResponse(
      {
        ok: false,
        error: "El año de publicación debe ser un entero entre 1900 y 2100.",
      },
      400,
    );
  }

  if (!Number.isInteger(groupId) || groupId < 1) {
    return jsonResponse(
      {
        ok: false,
        error: "Tienes que seleccionar un grupo válido.",
      },
      400,
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonResponse(
      {
        ok: false,
        error: "Formato de imagen no soportado. Usa JPG, JPEG, PNG, WEBP, GIF o AVIF.",
      },
      400,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error: "La carátula supera el límite de 8 MB.",
      },
      400,
    );
  }

  try {
    await validateGroupExists(supabase, groupId);

    const nextImageNumber = await getNextDiscoCoverNumber(supabase, bucket, folder);
    const extension = inferExtension(file);
    const imageName = `${nextImageNumber}.${extension}`;
    const storagePath = `${folder}/${imageName}`;
    const uploadBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, uploadBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse(
        {
          ok: false,
          error: `No he podido subir la carátula al bucket: ${uploadError.message}`,
        },
        500,
      );
    }

    const { data, error: insertError } = await supabase
      .from("discos")
      .insert({
        nombre,
        year_publicacion: yearPublicacion,
        caratula: imageName,
        discografica,
        productor,
        grupo_id: groupId,
      })
      .select("id")
      .single();

    if (insertError) {
      await supabase.storage.from(bucket).remove([storagePath]);

      return jsonResponse(
        {
          ok: false,
          error: `No he podido crear el disco: ${insertError.message}`,
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      discoId: Number((data as { id?: number | null } | null)?.id ?? null),
      imageName,
      imageNumber: nextImageNumber,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Ha fallado el alta del disco.",
      },
      500,
    );
  }
}

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;

type ConcertGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type ConcertAssetRow = {
  id: number;
  fecha: string;
  entrada: string | null;
  cartel: string | null;
  grupo: ConcertGroupRelation;
};

type ConcertAssetReference = {
  concertId: number;
  groupName: string | null;
};

export type ConcertStorageAudit = {
  label: string;
  bucket: string;
  error: string | null;
  databaseUsageCount: number;
  databaseUniqueCount: number;
  storageCount: number;
  storageBytes: number;
  matchedCount: number;
  missingInStorage: string[];
  missingInDatabase: string[];
};

export type ConcertAssetsAuditResult = {
  configured: boolean;
  error: string | null;
  entradas: ConcertStorageAudit;
  carteles: ConcertStorageAudit;
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getSupabasePublicKey();
}

function createSupabaseServerClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function sortNames(values: string[]) {
  return [...values].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function createEmptyBucketAudit(
  label: string,
  bucket: string,
  error: string | null = null,
): ConcertStorageAudit {
  return {
    label,
    bucket,
    error,
    databaseUsageCount: 0,
    databaseUniqueCount: 0,
    storageCount: 0,
    storageBytes: 0,
    matchedCount: 0,
    missingInStorage: [],
    missingInDatabase: [],
  };
}

function getConcertGroupName(group: ConcertGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function normalizeBucketObjectName(
  rawValue: string | null,
  expectedBucket: string,
) {
  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const url = new URL(normalizedValue);
      const segments = url.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment));
      const publicIndex = segments.indexOf("public");

      if (publicIndex >= 0 && segments.length > publicIndex + 2) {
        const bucket = segments[publicIndex + 1];
        const objectPath = segments.slice(publicIndex + 2).join("/").trim();

        if (bucket.toLowerCase() === expectedBucket.toLowerCase() && objectPath) {
          return objectPath;
        }
      }

      return segments.at(-1)?.trim() || null;
    } catch {
      return null;
    }
  }

  const segments = normalizedValue.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  if (segments[0].toLowerCase() === expectedBucket.toLowerCase()) {
    const objectPath = segments.slice(1).join("/").trim();
    return objectPath || null;
  }

  return segments.join("/").trim() || null;
}

async function listBucketImages(
  supabase: SupabaseClient,
  bucket: string,
) {
  const images: string[] = [];
  let totalBytes = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`No he podido leer el bucket "${bucket}": ${error.message}`);
    }

    const batch = (data ?? [])
      .filter((file) => IMAGE_FILE_PATTERN.test(file.name))
      .map((file) => {
        totalBytes += file.metadata?.size ?? 0;
        return file.name;
      });

    images.push(...batch);

    if ((data ?? []).length < PAGE_SIZE) {
      break;
    }
  }

  return {
    images: sortNames(images),
    totalBytes,
  };
}

async function listConcertAssetRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("conciertos")
    .select(
      "id, fecha, entrada, cartel, grupo:grupos!conciertos_grupo_id_fkey(nombre)",
    )
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(`No he podido leer los conciertos: ${error.message}`);
  }

  return (data as ConcertAssetRow[] | null) ?? [];
}

function formatReferencePreview(
  fileName: string,
  references: ConcertAssetReference[],
) {
  const preview = references
    .slice(0, 4)
    .map((reference) => {
      const groupLabel = reference.groupName ? ` ${reference.groupName}` : "";
      return `#${reference.concertId}${groupLabel}`;
    })
    .join(" | ");

  const remainder =
    references.length > 4 ? ` | +${references.length - 4} más` : "";

  return `${fileName} -> ${preview}${remainder}`;
}

function buildBucketAudit(
  rows: ConcertAssetRow[],
  field: "entrada" | "cartel",
  label: string,
  bucket: string,
  storageImages: string[],
  storageBytes: number,
): ConcertStorageAudit {
  const referencesByFile = new Map<string, ConcertAssetReference[]>();
  let databaseUsageCount = 0;

  for (const row of rows) {
    const objectName = normalizeBucketObjectName(row[field], bucket);

    if (!objectName) {
      continue;
    }

    databaseUsageCount += 1;

    const references = referencesByFile.get(objectName) ?? [];
    references.push({
      concertId: row.id,
      groupName: getConcertGroupName(row.grupo),
    });
    referencesByFile.set(objectName, references);
  }

  const databaseImages = sortNames([...referencesByFile.keys()]);
  const databaseSet = new Set(databaseImages);
  const storageSet = new Set(storageImages);

  return {
    label,
    bucket,
    error: null,
    databaseUsageCount,
    databaseUniqueCount: databaseImages.length,
    storageCount: storageImages.length,
    storageBytes,
    matchedCount: databaseImages.filter((image) => storageSet.has(image)).length,
    missingInStorage: databaseImages
      .filter((image) => !storageSet.has(image))
      .map((image) => formatReferencePreview(image, referencesByFile.get(image) ?? [])),
    missingInDatabase: storageImages.filter((image) => !databaseSet.has(image)),
  };
}

export async function getConcertAssetsAudit(): Promise<ConcertAssetsAuditResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    const error =
      "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.";

    return {
      configured: false,
      error,
      entradas: createEmptyBucketAudit("Entradas", "entradas", error),
      carteles: createEmptyBucketAudit("Carteles", "carteles", error),
    };
  }

  try {
    const [rows, entradasBucket, cartelesBucket] = await Promise.all([
      listConcertAssetRows(supabase),
      listBucketImages(supabase, "entradas"),
      listBucketImages(supabase, "carteles"),
    ]);

    return {
      configured: true,
      error: null,
      entradas: buildBucketAudit(
        rows,
        "entrada",
        "Entradas",
        "entradas",
        entradasBucket.images,
        entradasBucket.totalBytes,
      ),
      carteles: buildBucketAudit(
        rows,
        "cartel",
        "Carteles",
        "carteles",
        cartelesBucket.images,
        cartelesBucket.totalBytes,
      ),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No he podido auditar los assets de conciertos.";

    return {
      configured: true,
      error: message,
      entradas: createEmptyBucketAudit("Entradas", "entradas", message),
      carteles: createEmptyBucketAudit("Carteles", "carteles", message),
    };
  }
}

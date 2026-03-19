import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPhotoBucketName } from "@/lib/supabase/photos";

const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const PAGE_SIZE = 1000;

type NumericSummary = {
  min: number | null;
  max: number | null;
  gapCount: number;
  gapPreview: string[];
};

export type PhotoAuditResult = {
  bucket: string;
  configured: boolean;
  error: string | null;
  databaseCount: number;
  storageCount: number;
  matchedCount: number;
  missingInStorage: string[];
  missingInDatabase: string[];
  databaseSequence: NumericSummary;
  storageSequence: NumericSummary;
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

function sortNames(values: string[]) {
  return [...values].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function extractImageNumber(fileName: string) {
  const match = fileName.match(/^(\d+)\.[^.]+$/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function compressNumberRanges(values: number[]) {
  if (values.length === 0) {
    return [];
  }

  const ranges: string[] = [];
  let rangeStart = values[0];
  let previous = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];

    if (current === previous + 1) {
      previous = current;
      continue;
    }

    ranges.push(
      rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`,
    );
    rangeStart = current;
    previous = current;
  }

  ranges.push(
    rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`,
  );

  return ranges;
}

function summarizeNumericSequence(names: string[]): NumericSummary {
  const values = [...new Set(names.map(extractImageNumber).filter((value) => value !== null))]
    .sort((left, right) => left - right);

  if (values.length === 0) {
    return {
      min: null,
      max: null,
      gapCount: 0,
      gapPreview: [],
    };
  }

  const gaps: number[] = [];

  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];

    for (let candidate = previous + 1; candidate < current; candidate += 1) {
      gaps.push(candidate);
    }
  }

  return {
    min: values[0],
    max: values.at(-1) ?? null,
    gapCount: gaps.length,
    gapPreview: compressNumberRanges(gaps).slice(0, 24),
  };
}

async function listBucketImages(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
) {
  const images: string[] = [];

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
      .map((file) => file.name);

    images.push(...batch);

    if ((data ?? []).length < PAGE_SIZE) {
      break;
    }
  }

  return sortNames(images);
}

async function listDatabaseImages(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
) {
  const images: string[] = [];

  const { count, error: countError } = await supabase
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket);

  if (countError) {
    throw new Error(
      `No he podido contar las fotos del bucket "${bucket}" en la base de datos: ${countError.message}`,
    );
  }

  for (let start = 0; start < (count ?? 0); start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("fotos")
      .select("imagen")
      .eq("bucket", bucket)
      .order("imagen", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `No he podido leer las fotos del bucket "${bucket}" en la base de datos: ${error.message}`,
      );
    }

    images.push(...(data ?? []).map((row) => row.imagen as string));
  }

  return {
    count: count ?? images.length,
    images: sortNames(images),
  };
}

export async function getPhotoAudit(): Promise<PhotoAuditResult> {
  const bucket = getPhotoBucketName();
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServerKey();

  if (!supabaseUrl || !supabaseKey) {
    return {
      bucket,
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      databaseCount: 0,
      storageCount: 0,
      matchedCount: 0,
      missingInStorage: [],
      missingInDatabase: [],
      databaseSequence: { min: null, max: null, gapCount: 0, gapPreview: [] },
      storageSequence: { min: null, max: null, gapCount: 0, gapPreview: [] },
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const [{ count: databaseCount, images: databaseImages }, storageImages] =
      await Promise.all([
        listDatabaseImages(supabase, bucket),
        listBucketImages(supabase, bucket),
      ]);

    const databaseSet = new Set(databaseImages);
    const storageSet = new Set(storageImages);

    const missingInStorage = databaseImages.filter((image) => !storageSet.has(image));
    const missingInDatabase = storageImages.filter((image) => !databaseSet.has(image));

    return {
      bucket,
      configured: true,
      error: null,
      databaseCount,
      storageCount: storageImages.length,
      matchedCount: databaseImages.filter((image) => storageSet.has(image)).length,
      missingInStorage,
      missingInDatabase,
      databaseSequence: summarizeNumericSequence(databaseImages),
      storageSequence: summarizeNumericSequence(storageImages),
    };
  } catch (error) {
    return {
      bucket,
      configured: true,
      error: error instanceof Error ? error.message : "No he podido auditar las fotos.",
      databaseCount: 0,
      storageCount: 0,
      matchedCount: 0,
      missingInStorage: [],
      missingInDatabase: [],
      databaseSequence: { min: null, max: null, gapCount: 0, gapPreview: [] },
      storageSequence: { min: null, max: null, gapCount: 0, gapPreview: [] },
    };
  }
}

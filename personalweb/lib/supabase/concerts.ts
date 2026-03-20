import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ConcertGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type ConcertDatabaseRow = {
  id: number;
  fecha: string;
  sala: string | null;
  ciudad: string | null;
  festival: boolean | null;
  fotos: boolean | null;
  entrada: string | null;
  descripcion: string | null;
  cartel: string | null;
  cronica: string | null;
  videos: string[] | null;
  videos_instagram: string[] | null;
  grupo: ConcertGroupRelation;
};

export type ConcertAsset = {
  id: string;
  dateLabel: string;
  city: string | null;
  venue: string | null;
  groupName: string | null;
  festival: boolean;
  hasPhotos: boolean;
  ticket: string | null;
  poster: string | null;
  ticketImageSrc: string | null;
  posterImageSrc: string | null;
  description: string | null;
  review: string | null;
  videos: string[];
  instagramVideos: string[];
};

export type ConcertListResult = {
  concerts: ConcertAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

const CONCERTS_SELECT_COLUMNS =
  "id, fecha, sala, ciudad, festival, fotos, entrada, descripcion, cartel, cronica, videos, videos_instagram, grupo:grupos!conciertos_grupo_id_fkey(nombre)";

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

function getConcertGroupName(group: ConcertGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function buildConcertDateLabel(date: string) {
  const [rawYear, rawMonth, rawDay] = date.split("-");
  const yearValue = Number.parseInt(rawYear ?? "", 10);
  const monthValue = Number.parseInt(rawMonth ?? "", 10);
  const dayValue = Number.parseInt(rawDay ?? "", 10);

  if (
    !Number.isInteger(yearValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(dayValue)
  ) {
    return date;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(yearValue, monthValue - 1, dayValue));
}

function normalizeLinks(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function getStorageAssetPublicUrl(
  assetPath: string | null,
  defaultBucket: string,
) {
  const normalizedPath = assetPath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const hasExplicitBucket = segments.length > 1;
  const bucket = hasExplicitBucket ? segments[0] : defaultBucket;
  const objectPath = hasExplicitBucket
    ? segments.slice(1).join("/").trim()
    : normalizedPath;

  if (!bucket || !objectPath) {
    return null;
  }

  const encodedPath = objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
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

export async function getConcertList(): Promise<ConcertListResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      concerts: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("conciertos")
    .select(CONCERTS_SELECT_COLUMNS)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return {
      concerts: [],
      configured: true,
      error: `No he podido leer los conciertos: ${error.message}`,
      totalCount: 0,
    };
  }

  const rows = (data as ConcertDatabaseRow[] | null) ?? [];
  const concerts = rows.map((concert) => ({
    id: String(concert.id),
    dateLabel: buildConcertDateLabel(concert.fecha),
    city: concert.ciudad?.trim() || null,
    venue: concert.sala?.trim() || null,
    groupName: getConcertGroupName(concert.grupo),
    festival: Boolean(concert.festival),
    hasPhotos: Boolean(concert.fotos),
    ticket: concert.entrada?.trim() || null,
    poster: concert.cartel?.trim() || null,
    ticketImageSrc: getStorageAssetPublicUrl(concert.entrada, "entradas"),
    posterImageSrc: getStorageAssetPublicUrl(concert.cartel, "carteles"),
    description: concert.descripcion?.trim() || null,
    review: concert.cronica?.trim() || null,
    videos: normalizeLinks(concert.videos),
    instagramVideos: normalizeLinks(concert.videos_instagram),
  }));

  return {
    concerts,
    configured: true,
    error: null,
    totalCount: concerts.length,
  };
}

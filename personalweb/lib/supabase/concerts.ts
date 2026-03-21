import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

type ConcertDatabaseRow = {
  id: number | string;
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

type ConcertPhotoGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type ConcertPhotoRow = {
  id: number;
  bucket: string | null;
  imagen: string;
  titulo: string | null;
  personas: string[] | null;
  anio: number | null;
  origen: string | null;
  descripcion: string | null;
  fecha: string | null;
  lugar: string | null;
  concierto_id: number | string | null;
  grupo: ConcertPhotoGroupRelation;
};

export type ConcertPhotoAsset = {
  id: string;
  name: string;
  title: string;
  src: string;
  people: string[];
  dateLabel: string | null;
  origin: string | null;
  place: string | null;
  description: string | null;
  groupName: string | null;
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
  photos: ConcertPhotoAsset[];
  photoCount: number;
};

export type ConcertListResult = {
  concerts: ConcertAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
};

const CONCERTS_SELECT_COLUMNS =
  "id, fecha, sala, ciudad, festival, fotos, entrada, descripcion, cartel, cronica, videos, videos_instagram, grupo:grupos!conciertos_grupo_id_fkey(nombre)";
const CONCERT_PHOTOS_SELECT_COLUMNS =
  "id, bucket, imagen, titulo, personas, anio, origen, descripcion, fecha, lugar, concierto_id, grupo:grupos!fotos_grupo_id_fkey(nombre)";

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

function buildPhotoDateLabel(date: string | null, year: number | null) {
  if (date) {
    const [rawYear, rawMonth, rawDay] = date.split("-");
    const yearValue = Number.parseInt(rawYear ?? "", 10);
    const monthValue = Number.parseInt(rawMonth ?? "", 10);
    const dayValue = Number.parseInt(rawDay ?? "", 10);

    if (
      Number.isInteger(yearValue) &&
      Number.isInteger(monthValue) &&
      Number.isInteger(dayValue)
    ) {
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(yearValue, monthValue - 1, dayValue));
    }
  }

  if (Number.isInteger(year)) {
    return String(year);
  }

  return null;
}

function parseIntegerIdentifier(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = Number.parseInt(value.trim(), 10);

    if (Number.isInteger(normalizedValue)) {
      return normalizedValue;
    }
  }

  return null;
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

function getConcertPhotoGroupName(group: ConcertPhotoGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function mapConcertPhoto(photo: ConcertPhotoRow): ConcertPhotoAsset | null {
  if (!IMAGE_FILE_PATTERN.test(photo.imagen)) {
    return null;
  }

  const bucket = photo.bucket?.trim() || "fotos";

  return {
    id: String(photo.id),
    name: photo.imagen,
    title: photo.titulo?.trim() || photo.imagen,
    src: getStorageAssetPublicUrl(photo.imagen, bucket) ?? "",
    people: (photo.personas ?? [])
      .map((person) => person?.trim())
      .filter((person): person is string => Boolean(person)),
    dateLabel: buildPhotoDateLabel(photo.fecha, photo.anio),
    origin: photo.origen?.trim() || null,
    place: photo.lugar?.trim() || null,
    description: photo.descripcion?.trim() || null,
    groupName: getConcertPhotoGroupName(photo.grupo),
  };
}

async function getConcertPhotosByConcertId(
  supabase: SupabaseClient,
  concertIds: number[],
) {
  const pageSize = 1000;

  if (concertIds.length === 0) {
    return {
      photosByConcertId: new Map<number, ConcertPhotoAsset[]>(),
      error: null,
    };
  }

  const rows: ConcertPhotoRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("fotos")
      .select(CONCERT_PHOTOS_SELECT_COLUMNS)
      .in("concierto_id", concertIds)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return {
        photosByConcertId: new Map<number, ConcertPhotoAsset[]>(),
        error: `No he podido leer las fotos asociadas a conciertos: ${error.message}`,
      };
    }

    const chunk = (data as ConcertPhotoRow[] | null) ?? [];

    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const photosByConcertId = new Map<number, ConcertPhotoAsset[]>();

  for (const row of rows) {
    const normalizedConcertId = parseIntegerIdentifier(row.concierto_id);

    if (normalizedConcertId === null) {
      continue;
    }

    const photo = mapConcertPhoto(row);

    if (!photo || !photo.src) {
      continue;
    }

    const current = photosByConcertId.get(normalizedConcertId) ?? [];
    current.push(photo);
    photosByConcertId.set(normalizedConcertId, current);
  }

  return {
    photosByConcertId,
    error: null,
  };
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
  const concertIds = rows
    .map((concert) => parseIntegerIdentifier(concert.id))
    .filter((concertId): concertId is number => concertId !== null);
  const { photosByConcertId, error: photosError } =
    await getConcertPhotosByConcertId(supabase, concertIds);

  const normalizedConcerts = rows.map((concert) => {
    const normalizedConcertId = parseIntegerIdentifier(concert.id);
    const photos =
      normalizedConcertId === null
        ? []
        : photosByConcertId.get(normalizedConcertId) ?? [];

    return {
      id: String(concert.id),
      dateLabel: buildConcertDateLabel(concert.fecha),
      city: concert.ciudad?.trim() || null,
      venue: concert.sala?.trim() || null,
      groupName: getConcertGroupName(concert.grupo),
      festival: Boolean(concert.festival),
      hasPhotos: Boolean(concert.fotos) || photos.length > 0,
      ticket: concert.entrada?.trim() || null,
      poster: concert.cartel?.trim() || null,
      ticketImageSrc: getStorageAssetPublicUrl(concert.entrada, "entradas"),
      posterImageSrc: getStorageAssetPublicUrl(concert.cartel, "carteles"),
      description: concert.descripcion?.trim() || null,
      review: concert.cronica?.trim() || null,
      videos: normalizeLinks(concert.videos),
      instagramVideos: normalizeLinks(concert.videos_instagram),
      photos,
      photoCount: photos.length,
    };
  });

  return {
    concerts: normalizedConcerts,
    configured: true,
    error: photosError,
    totalCount: normalizedConcerts.length,
  };
}

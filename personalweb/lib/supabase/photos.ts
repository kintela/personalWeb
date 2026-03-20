import "server-only";

import { createClient } from "@supabase/supabase-js";

const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const DEFAULT_BUCKET = "fotos";
const PHOTO_GALLERY_PAGE_SIZE = 48;

export type PhotoAsset = {
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

export type PhotoPerson = {
  name: string;
  photoCount: number;
};

export type PhotoGalleryResult = {
  photos: PhotoAsset[];
  bucket: string;
  configured: boolean;
  error: string | null;
  totalCount: number;
  loadedCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

export type PhotoPeopleResult = {
  people: PhotoPerson[];
  configured: boolean;
  error: string | null;
  totalPeople: number;
  totalAppearances: number;
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

export function getPhotoBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? DEFAULT_BUCKET;
}

export function getPhotoPublicUrl(path: string, bucket = getPhotoBucketName()) {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl) {
    return "";
  }

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
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

function normalizePageNumber(page: number) {
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

function getPhotoGroupName(
  group:
    | {
        nombre: string | null;
      }
    | {
        nombre: string | null;
      }[]
    | null
    | undefined,
) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre ?? null;
  }

  return group.nombre ?? null;
}

function createSupabaseServerClient() {
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

export async function getPhotoGallery(page = 1): Promise<PhotoGalleryResult> {
  const bucket = getPhotoBucketName();
  const currentPage = normalizePageNumber(page);
  const rangeFrom = (currentPage - 1) * PHOTO_GALLERY_PAGE_SIZE;
  const rangeTo = rangeFrom + PHOTO_GALLERY_PAGE_SIZE - 1;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      photos: [],
      bucket,
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
      loadedCount: 0,
      currentPage,
      totalPages: 1,
      pageSize: PHOTO_GALLERY_PAGE_SIZE,
    };
  }

  const { data, error, count } = await supabase
    .from("fotos")
    .select(
      "id, bucket, imagen, titulo, personas, fecha, anio, origen, lugar, descripcion, grupo:grupos!fotos_grupo_id_fkey(nombre)",
      {
        count: "exact",
      },
    )
    .eq("bucket", bucket)
    .order("id", { ascending: true })
    .range(rangeFrom, rangeTo);

  if (error) {
    return {
      photos: [],
      bucket,
      configured: true,
      error: `No he podido leer las fotos de la base de datos para el bucket "${bucket}": ${error.message}`,
      totalCount: 0,
      loadedCount: 0,
      currentPage,
      totalPages: 1,
      pageSize: PHOTO_GALLERY_PAGE_SIZE,
    };
  }

  const photos = [...(data ?? [])]
    .filter((photo) => IMAGE_FILE_PATTERN.test(photo.imagen))
    .map((photo) => ({
      id: String(photo.id),
      name: photo.imagen,
      title: photo.titulo?.trim() || photo.imagen,
      src: getPhotoPublicUrl(photo.imagen, photo.bucket ?? bucket),
      people: (photo.personas ?? [])
        .map((person) => person?.trim())
        .filter((person): person is string => Boolean(person)),
      dateLabel: buildPhotoDateLabel(photo.fecha, photo.anio),
      origin: photo.origen ?? null,
      place: photo.lugar?.trim() || null,
      description: photo.descripcion?.trim() || null,
      groupName: getPhotoGroupName(photo.grupo),
    }));

  const totalCount = count ?? photos.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PHOTO_GALLERY_PAGE_SIZE));

  return {
    photos,
    bucket,
    configured: true,
    error: null,
    totalCount,
    loadedCount: photos.length,
    currentPage: Math.min(currentPage, totalPages),
    totalPages,
    pageSize: PHOTO_GALLERY_PAGE_SIZE,
  };
}

export async function getPhotoPeopleList(): Promise<PhotoPeopleResult> {
  const bucket = getPhotoBucketName();
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      people: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalPeople: 0,
      totalAppearances: 0,
    };
  }

  const { data, error } = await supabase
    .from("fotos")
    .select("personas")
    .eq("bucket", bucket);

  if (error) {
    return {
      people: [],
      configured: true,
      error: `No he podido leer las personas de la base de datos para el bucket "${bucket}": ${error.message}`,
      totalPeople: 0,
      totalAppearances: 0,
    };
  }

  const peopleByKey = new Map<string, PhotoPerson>();
  let totalAppearances = 0;

  for (const photo of data ?? []) {
    const normalizedPeopleInPhoto = new Set<string>();

    for (const rawPerson of photo.personas ?? []) {
      const personName = rawPerson?.trim();

      if (!personName) {
        continue;
      }

      const normalizedKey = personName.toLocaleLowerCase("es-ES");

      if (normalizedPeopleInPhoto.has(normalizedKey)) {
        continue;
      }

      normalizedPeopleInPhoto.add(normalizedKey);
      totalAppearances += 1;

      const currentPerson = peopleByKey.get(normalizedKey);

      if (currentPerson) {
        currentPerson.photoCount += 1;
        continue;
      }

      peopleByKey.set(normalizedKey, {
        name: personName,
        photoCount: 1,
      });
    }
  }

  const people = [...peopleByKey.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "es", {
      sensitivity: "base",
      numeric: true,
    }),
  );

  return {
    people,
    configured: true,
    error: null,
    totalPeople: people.length,
    totalAppearances,
  };
}

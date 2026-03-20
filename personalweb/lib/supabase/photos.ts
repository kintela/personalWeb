import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  hasActivePhotoFilter,
  hasActivePhotoPeopleGroup,
  type PhotoFilterField,
  type PhotoPeopleGroup,
} from "@/lib/photo-filters";

const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const DEFAULT_BUCKET = "fotos";
const PHOTO_GALLERY_PAGE_SIZE = 200;
const PHOTO_FILTER_BATCH_SIZE = 1000;
const PHOTO_SELECT_COLUMNS =
  "id, bucket, imagen, titulo, personas, anio, grupo_id, origen, descripcion, fecha, lugar, categoria, concierto_id, created_at, updated_at, grupo:grupos!fotos_grupo_id_fkey(nombre)";

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
  filterField: PhotoFilterField;
  filterValue: string;
  peopleGroup: PhotoPeopleGroup;
};

export type PhotoPeopleResult = {
  people: PhotoPerson[];
  configured: boolean;
  error: string | null;
  totalPeople: number;
  totalAppearances: number;
};

type PhotoGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type PhotoDatabaseRow = {
  id: number;
  bucket: string | null;
  imagen: string;
  titulo: string | null;
  personas: string[] | null;
  anio: number | null;
  grupo_id: number | null;
  origen: string | null;
  descripcion: string | null;
  fecha: string | null;
  lugar: string | null;
  categoria: string | null;
  concierto_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  grupo: PhotoGroupRelation;
};

type PhotoPeopleRow = {
  personas: string[] | null;
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
  group: PhotoGroupRelation,
) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre ?? null;
  }

  return group.nombre ?? null;
}

function normalizePhotoFilterText(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-ES");
}

function getNormalizedPhotoPeopleCount(personas: string[] | null | undefined) {
  return (personas ?? [])
    .map((person) => person?.trim())
    .filter((person): person is string => Boolean(person)).length;
}

function buildPhotoFilterValues(
  photo: PhotoDatabaseRow,
) {
  const groupName = getPhotoGroupName(photo.grupo);
  const people = (photo.personas ?? [])
    .map((person) => person?.trim())
    .filter((person): person is string => Boolean(person));

  return {
    all: [
      photo.id,
      photo.bucket,
      photo.imagen,
      photo.titulo,
      people.join(", "),
      photo.anio,
      groupName,
      photo.grupo_id,
      photo.origen,
      photo.descripcion,
      photo.fecha,
      photo.lugar,
      photo.categoria,
      photo.concierto_id,
      photo.created_at,
      photo.updated_at,
    ],
    id: [photo.id],
    bucket: [photo.bucket],
    imagen: [photo.imagen],
    titulo: [photo.titulo],
    personas: people,
    anio: [photo.anio],
    grupo: [groupName],
    grupo_id: [photo.grupo_id],
    origen: [photo.origen],
    descripcion: [photo.descripcion],
    fecha: [photo.fecha],
    lugar: [photo.lugar],
    categoria: [photo.categoria],
    concierto_id: [photo.concierto_id],
    created_at: [photo.created_at],
    updated_at: [photo.updated_at],
  } satisfies Record<PhotoFilterField, Array<string | number | null | undefined>>;
}

function matchesPhotoFilter(
  photo: Parameters<typeof buildPhotoFilterValues>[0],
  filterField: PhotoFilterField,
  filterValue: string,
) {
  if (!hasActivePhotoFilter(filterValue)) {
    return true;
  }

  const normalizedFilterValue = normalizePhotoFilterText(filterValue);
  const filterValues = buildPhotoFilterValues(photo)[filterField];

  return filterValues.some((value) =>
    normalizePhotoFilterText(value).includes(normalizedFilterValue),
  );
}

function matchesPhotoPeopleGroup(
  photo: Parameters<typeof buildPhotoFilterValues>[0],
  peopleGroup: PhotoPeopleGroup,
) {
  if (!hasActivePhotoPeopleGroup(peopleGroup)) {
    return true;
  }

  const peopleCount = getNormalizedPhotoPeopleCount(photo.personas);

  switch (peopleGroup) {
    case "solo":
      return peopleCount === 1;
    case "pair":
      return peopleCount === 2;
    case "trio":
      return peopleCount === 3;
    case "crowd":
      return peopleCount > 3;
    default:
      return true;
  }
}

async function fetchAllPhotosForFiltering(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
) {
  const photos: PhotoDatabaseRow[] = [];
  let rangeFrom = 0;

  while (true) {
    const rangeTo = rangeFrom + PHOTO_FILTER_BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from("fotos")
      .select(PHOTO_SELECT_COLUMNS)
      .eq("bucket", bucket)
      .order("id", { ascending: true })
      .range(rangeFrom, rangeTo);

    if (error) {
      return {
        data: null,
        error,
      };
    }

    if (!data || data.length === 0) {
      break;
    }

    photos.push(...((data as PhotoDatabaseRow[] | null) ?? []));

    if (data.length < PHOTO_FILTER_BATCH_SIZE) {
      break;
    }

    rangeFrom += PHOTO_FILTER_BATCH_SIZE;
  }

  return {
    data: photos,
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

export async function getPhotoGallery(options?: {
  page?: number;
  filterField?: PhotoFilterField;
  filterValue?: string;
  peopleGroup?: PhotoPeopleGroup;
}): Promise<PhotoGalleryResult> {
  const bucket = getPhotoBucketName();
  const requestedPage = normalizePageNumber(options?.page ?? 1);
  const filterField = options?.filterField ?? "all";
  const filterValue = options?.filterValue?.trim() ?? "";
  const peopleGroup = options?.peopleGroup ?? "all";
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
      currentPage: requestedPage,
      totalPages: 1,
      pageSize: PHOTO_GALLERY_PAGE_SIZE,
      filterField,
      filterValue,
      peopleGroup,
    };
  }

  if (hasActivePhotoFilter(filterValue) || hasActivePhotoPeopleGroup(peopleGroup)) {
    const { data, error } = await fetchAllPhotosForFiltering(supabase, bucket);

    if (error) {
      return {
        photos: [],
        bucket,
        configured: true,
        error: `No he podido leer las fotos de la base de datos para el bucket "${bucket}": ${error.message}`,
        totalCount: 0,
        loadedCount: 0,
        currentPage: requestedPage,
        totalPages: 1,
        pageSize: PHOTO_GALLERY_PAGE_SIZE,
        filterField,
        filterValue,
        peopleGroup,
      };
    }

    const filteredPhotos = (data ?? []).filter(
      (photo) =>
        matchesPhotoFilter(photo, filterField, filterValue) &&
        matchesPhotoPeopleGroup(photo, peopleGroup),
    );
    const totalCount = filteredPhotos.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalCount / PHOTO_GALLERY_PAGE_SIZE),
    );
    const currentPage = Math.min(requestedPage, totalPages);
    const rangeFrom = (currentPage - 1) * PHOTO_GALLERY_PAGE_SIZE;
    const rangeTo = rangeFrom + PHOTO_GALLERY_PAGE_SIZE;

    const photos = filteredPhotos
      .slice(rangeFrom, rangeTo)
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

    return {
      photos,
      bucket,
      configured: true,
      error: null,
      totalCount,
      loadedCount: photos.length,
      currentPage,
      totalPages,
      pageSize: PHOTO_GALLERY_PAGE_SIZE,
      filterField,
      filterValue,
      peopleGroup,
    };
  }

  const currentPage = requestedPage;
  const rangeFrom = (currentPage - 1) * PHOTO_GALLERY_PAGE_SIZE;
  const rangeTo = rangeFrom + PHOTO_GALLERY_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("fotos")
    .select(PHOTO_SELECT_COLUMNS, { count: "exact" })
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
      filterField,
      filterValue,
      peopleGroup,
    };
  }

  const rows = (data as PhotoDatabaseRow[] | null) ?? [];

  const photos = [...rows]
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
    filterField,
    filterValue,
    peopleGroup,
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

  for (const photo of ((data as PhotoPeopleRow[] | null) ?? [])) {
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

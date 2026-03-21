import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const VIDEOS_SELECT_COLUMNS =
  "id, imagen, enlace, texto, categoria, plataforma, info, created_at, updated_at";
const VIDEO_IMAGE_BUCKET = "caratulas";
const VIDEO_IMAGE_FOLDER = "pelis";

type VideoDatabaseRow = {
  id: number | string;
  imagen: string | null;
  enlace: string;
  texto: string;
  categoria: string | null;
  plataforma: string | null;
  info: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type VideoAsset = {
  id: string;
  image: string | null;
  imageSrc: string | null;
  link: string;
  title: string;
  category: string | null;
  platform: string | null;
  info: string | null;
};

export type VideoListResult = {
  videos: VideoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  categoryValue: string;
  platformValue: string;
  categoryOptions: string[];
  platformOptions: string[];
};

type GetVideoListOptions = {
  filterValue?: string | null;
  categoryValue?: string | null;
  platformValue?: string | null;
};

function normalizeVideoPlatformValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  switch (normalizedValue.toLocaleLowerCase("es-ES")) {
    case "rtve_play":
    case "rtve play":
      return "RTVE Play";
    case "primevideo":
    case "prime video":
      return "Prime Video";
    case "apple tv":
      return "Apple TV";
    case "filmin":
      return "Filmin";
    case "caixaforum":
      return "CaixaForum";
    case "disney+":
      return "Disney+";
    case "hbo":
      return "HBO";
    case "canalsurmas":
    case "canalsur más":
      return "CanalSur Más";
    case "google drive":
      return "Google Drive";
    case "documania tv":
      return "Documania TV";
    case "eitb":
      return "EITB";
    case "atresplayer":
      return "Atresplayer";
    case "youtube":
      return "YouTube";
    case "netflix":
      return "Netflix";
    case "plex":
      return "Plex";
    case "vimeo":
      return "Vimeo";
    case "arte":
      return "Arte";
    default:
      return normalizedValue;
  }
}

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

function normalizeVideoFilterValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function getVideoImagePublicUrl(imagePath: string | null) {
  const normalizedPath = imagePath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const withoutLeadingSlash = normalizedPath.replace(/^\/+/, "");
  const pathWithoutBucket = withoutLeadingSlash.startsWith(
    `${VIDEO_IMAGE_BUCKET}/`,
  )
    ? withoutLeadingSlash.slice(VIDEO_IMAGE_BUCKET.length + 1)
    : withoutLeadingSlash;
  const objectPath = pathWithoutBucket.startsWith(`${VIDEO_IMAGE_FOLDER}/`)
    ? pathWithoutBucket
    : `${VIDEO_IMAGE_FOLDER}/${pathWithoutBucket}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(VIDEO_IMAGE_BUCKET)}/${encodedPath}`;
}

function buildVideoSearchHaystack(video: VideoDatabaseRow) {
  return [
    String(video.id),
    video.imagen,
    video.enlace,
    video.texto,
    video.categoria,
    video.plataforma,
    normalizeVideoPlatformValue(video.plataforma),
    video.info,
    video.created_at,
    video.updated_at,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" \n")
    .toLocaleLowerCase("es-ES");
}

function mapVideo(video: VideoDatabaseRow): VideoAsset {
  return {
    id: String(video.id),
    image: video.imagen?.trim() || null,
    imageSrc: getVideoImagePublicUrl(video.imagen),
    link: video.enlace.trim(),
    title: video.texto.trim(),
    category: video.categoria?.trim() || null,
    platform: normalizeVideoPlatformValue(video.plataforma),
    info: video.info?.trim() || null,
  };
}

export async function getVideoList(
  options: GetVideoListOptions = {},
): Promise<VideoListResult> {
  const supabase = createSupabaseServerClient();
  const requestedFilterValue = normalizeVideoFilterValue(options.filterValue);
  const requestedCategoryValue = normalizeVideoFilterValue(options.categoryValue);
  const requestedPlatformValue = normalizeVideoFilterValue(options.platformValue);

  if (!supabase) {
    return {
      videos: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
      filterValue: requestedFilterValue,
      categoryValue: requestedCategoryValue,
      platformValue: requestedPlatformValue,
      categoryOptions: [],
      platformOptions: [],
    };
  }

  const { data, error } = await supabase
    .from("videos")
    .select(VIDEOS_SELECT_COLUMNS)
    .order("id", { ascending: true });

  if (error) {
    return {
      videos: [],
      configured: true,
      error: `No he podido leer los vídeos: ${error.message}`,
      totalCount: 0,
      filterValue: requestedFilterValue,
      categoryValue: requestedCategoryValue,
      platformValue: requestedPlatformValue,
      categoryOptions: [],
      platformOptions: [],
    };
  }

  const rows = (data as VideoDatabaseRow[] | null) ?? [];
  const categoryOptions = [
    ...new Set(
      rows
        .map((row) => row.categoria?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const platformOptions = [
    ...new Set(
      rows
        .map((row) => normalizeVideoPlatformValue(row.plataforma))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const normalizedCategoryValue = categoryOptions.includes(requestedCategoryValue)
    ? requestedCategoryValue
    : "";
  const normalizedRequestedPlatformValue = normalizeVideoPlatformValue(
    requestedPlatformValue,
  );
  const normalizedPlatformValue = platformOptions.includes(
    normalizedRequestedPlatformValue ?? "",
  )
    ? (normalizedRequestedPlatformValue ?? "")
    : "";
  const normalizedFilterValue = requestedFilterValue.toLocaleLowerCase("es-ES");
  const filteredRows = rows.filter((video) => {
    const matchesCategory =
      !normalizedCategoryValue ||
      (video.categoria?.trim() ?? "") === normalizedCategoryValue;
    const matchesPlatform =
      !normalizedPlatformValue ||
      normalizeVideoPlatformValue(video.plataforma) === normalizedPlatformValue;
    const matchesSearch =
      !normalizedFilterValue ||
      buildVideoSearchHaystack(video).includes(normalizedFilterValue);

    return matchesCategory && matchesPlatform && matchesSearch;
  });

  return {
    videos: filteredRows.map(mapVideo),
    configured: true,
    error: null,
    totalCount: filteredRows.length,
    filterValue: requestedFilterValue,
    categoryValue: normalizedCategoryValue,
    platformValue: normalizedPlatformValue,
    categoryOptions,
    platformOptions,
  };
}

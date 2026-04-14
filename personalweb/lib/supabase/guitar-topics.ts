import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const GUITAR_TOPICS_SELECT_COLUMNS =
  "id, grupo_id, nombre, observaciones, letra_imagen, grupo:grupos!temas_grupo_id_fkey(nombre)";
const GUITAR_TOPIC_VIDEOS_SELECT_COLUMNS =
  "id, tema_id, enlace, observaciones";
const GUITAR_LYRICS_BUCKET = "lyrics";
const GUITAR_TABLATURES_BUCKET = "tablaturas";

type TopicGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type GuitarTopicDatabaseRow = {
  id: number | string;
  grupo_id: number | string;
  nombre: string;
  observaciones: string | null;
  letra_imagen: string | null;
  grupo: TopicGroupRelation;
};

type GuitarTopicVideoDatabaseRow = {
  id: number | string;
  tema_id: number | string;
  enlace: string;
  observaciones: string | null;
};

export type GuitarTopicVideoAsset = {
  id: string;
  topicId: string;
  topicName: string;
  groupName: string;
  link: string;
  observations: string | null;
  platform: string | null;
  title: string;
};

export type GuitarTopicTablatureAsset = {
  id: string;
  fileName: string;
  path: string;
  imageSrc: string;
  pageNumber: number;
};

export type GuitarTopicAsset = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  observations: string | null;
  lyricImagePath: string | null;
  lyricImageSrc: string | null;
  tablatureImages: GuitarTopicTablatureAsset[];
  videos: GuitarTopicVideoAsset[];
};

export type GuitarTopicGroupOption = {
  id: string;
  name: string;
  topicCount: number;
};

export type GuitarTopicOption = {
  id: string;
  groupId: string;
  name: string;
  videoCount: number;
};

export type GuitarTopicListResult = {
  topics: GuitarTopicAsset[];
  configured: boolean;
  error: string | null;
  totalVideoCount: number;
  totalTopicCount: number;
  totalGroupCount: number;
  groupValue: string;
  topicValue: string;
  groupOptions: GuitarTopicGroupOption[];
  topicOptions: GuitarTopicOption[];
};

type GetGuitarTopicListOptions = {
  groupValue?: string | null;
  topicValue?: string | null;
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getGuitarTopicLyricImagePublicUrl(imagePath: string | null) {
  const normalizedPath = imagePath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const encodedPath = normalizedPath
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(GUITAR_LYRICS_BUCKET)}/${encodedPath}`;
}

export function getGuitarTopicTablaturePublicUrl(path: string | null) {
  const normalizedPath = path?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const encodedPath = normalizedPath
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(GUITAR_TABLATURES_BUCKET)}/${encodedPath}`;
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

function normalizeValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function trimNullableValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function getGroupName(group: TopicGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function getPlatformLabelFromUrl(rawUrl: string) {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      return "YouTube";
    }

    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      return "Vimeo";
    }

    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
      return "Instagram";
    }

    if (hostname === "rtve.es" || hostname.endsWith(".rtve.es")) {
      return "RTVE Play";
    }

    if (hostname === "drive.google.com") {
      return "Google Drive";
    }

    if (hostname === "dai.ly" || hostname === "dailymotion.com" || hostname.endsWith(".dailymotion.com")) {
      return "Dailymotion";
    }

    const hostnameParts = hostname.split(".");
    const compactHostname =
      hostnameParts.length >= 2
        ? hostnameParts.slice(-2).join(".")
        : hostname;

    return compactHostname || null;
  } catch {
    return null;
  }
}

function compareTopics(left: GuitarTopicAsset, right: GuitarTopicAsset) {
  const byGroup = left.groupName.localeCompare(right.groupName, "es", {
    sensitivity: "base",
  });

  if (byGroup !== 0) {
    return byGroup;
  }

  const byName = left.name.localeCompare(right.name, "es", {
    sensitivity: "base",
  });

  if (byName !== 0) {
    return byName;
  }

  return left.id.localeCompare(right.id, "es", { numeric: true });
}

function mapTopicVideo(
  row: GuitarTopicVideoDatabaseRow,
  topicId: string,
  topicName: string,
  groupName: string,
  index: number,
): GuitarTopicVideoAsset {
  const link = row.enlace.trim();

  return {
    id: String(row.id),
    topicId,
    topicName,
    groupName,
    link,
    observations: trimNullableValue(row.observaciones),
    platform: getPlatformLabelFromUrl(link),
    title: `Vídeo ${index + 1}`,
  };
}

function getNumericPrefix(value: string) {
  const match = value.match(/^(\d+)/);

  return match ? Number.parseInt(match[1] ?? "", 10) : Number.NaN;
}

function compareTablatureFileNames(left: string, right: string) {
  const leftName = left.trim();
  const rightName = right.trim();
  const leftBaseName = leftName.replace(/\.[^.]+$/, "");
  const rightBaseName = rightName.replace(/\.[^.]+$/, "");
  const leftNumericPrefix = getNumericPrefix(leftBaseName);
  const rightNumericPrefix = getNumericPrefix(rightBaseName);

  if (!Number.isNaN(leftNumericPrefix) && !Number.isNaN(rightNumericPrefix)) {
    if (leftNumericPrefix !== rightNumericPrefix) {
      return leftNumericPrefix - rightNumericPrefix;
    }
  }

  return leftName.localeCompare(rightName, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function isImageFileName(fileName: string) {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(fileName);
}

async function getTopicTablatureImages(
  supabase: SupabaseClient,
  topicId: string,
): Promise<{
  images: GuitarTopicTablatureAsset[];
  error: string | null;
}> {
  const normalizedTopicId = topicId.trim();

  if (!normalizedTopicId) {
    return {
      images: [],
      error: null,
    };
  }

  const { data, error } = await supabase.storage
    .from(GUITAR_TABLATURES_BUCKET)
    .list(normalizedTopicId, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    return {
      images: [],
      error: `No he podido leer las tablaturas del tema ${normalizedTopicId}: ${error.message}`,
    };
  }

  const fileNames = (data ?? [])
    .map((item) => item.name?.trim() ?? "")
    .filter((fileName) => fileName && isImageFileName(fileName))
    .sort(compareTablatureFileNames);

  if (fileNames.length === 0) {
    return {
      images: [],
      error: null,
    };
  }

  const images = fileNames.flatMap((fileName, index) => {
    const path = `${normalizedTopicId}/${fileName}`;
    const imageSrc = getGuitarTopicTablaturePublicUrl(path);

    if (!imageSrc) {
      return [];
    }

    return [
      {
        id: `${normalizedTopicId}-${index + 1}`,
        fileName,
        path,
        imageSrc,
        pageNumber: index + 1,
      },
    ];
  });

  if (images.length !== fileNames.length) {
    return {
      images: [],
      error: `No he podido preparar las URLs públicas de las tablaturas del tema ${normalizedTopicId}.`,
    };
  }

  return {
    images,
    error: null,
  };
}

export async function getGuitarTopicTablatureImages(topicId: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      images: [],
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
    };
  }

  return getTopicTablatureImages(supabase, topicId);
}

export async function getGuitarTopicList(
  options: GetGuitarTopicListOptions = {},
): Promise<GuitarTopicListResult> {
  const supabase = createSupabaseServerClient();
  const requestedGroupValue = normalizeValue(options.groupValue);
  const requestedTopicValue = normalizeValue(options.topicValue);

  if (!supabase) {
    return {
      topics: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalVideoCount: 0,
      totalTopicCount: 0,
      totalGroupCount: 0,
      groupValue: requestedGroupValue,
      topicValue: requestedTopicValue,
      groupOptions: [],
      topicOptions: [],
    };
  }

  const [{ data: topicData, error: topicError }, { data: videoData, error: videoError }] =
    await Promise.all([
      supabase
        .from("temas")
        .select(GUITAR_TOPICS_SELECT_COLUMNS)
        .order("id", { ascending: true }),
      supabase
        .from("videos_temas")
        .select(GUITAR_TOPIC_VIDEOS_SELECT_COLUMNS)
        .order("id", { ascending: true }),
    ]);

  if (topicError || videoError) {
    const message = [topicError?.message, videoError?.message]
      .filter(Boolean)
      .join(" · ");

    return {
      topics: [],
      configured: true,
      error: `No he podido leer los temas de guitarra: ${message}`,
      totalVideoCount: 0,
      totalTopicCount: 0,
      totalGroupCount: 0,
      groupValue: requestedGroupValue,
      topicValue: requestedTopicValue,
      groupOptions: [],
      topicOptions: [],
    };
  }

  const topicRows = (topicData as GuitarTopicDatabaseRow[] | null) ?? [];
  const videoRows = (videoData as GuitarTopicVideoDatabaseRow[] | null) ?? [];
  const videosByTopicId = new Map<string, GuitarTopicVideoDatabaseRow[]>();

  for (const row of videoRows) {
    const topicId = String(row.tema_id);
    const currentRows = videosByTopicId.get(topicId) ?? [];

    currentRows.push(row);
    videosByTopicId.set(topicId, currentRows);
  }

  let topics: GuitarTopicAsset[] = topicRows
    .map((row) => {
      const id = String(row.id);
      const groupId = String(row.grupo_id);
      const name = row.nombre.trim();
      const groupName = getGroupName(row.grupo) ?? `Grupo ${groupId}`;
      const videos = (videosByTopicId.get(id) ?? [])
        .filter((videoRow) => Boolean(videoRow.enlace.trim()))
        .map((videoRow, index) =>
          mapTopicVideo(videoRow, id, name, groupName, index),
        );

      return {
        id,
        groupId,
        groupName,
        name,
        observations: trimNullableValue(row.observaciones),
        lyricImagePath: trimNullableValue(row.letra_imagen),
        lyricImageSrc: getGuitarTopicLyricImagePublicUrl(
          trimNullableValue(row.letra_imagen),
        ),
        tablatureImages: [],
        videos,
      };
    })
    .sort(compareTopics);

  const groupOptionMap = new Map<string, GuitarTopicGroupOption>();

  for (const topic of topics) {
    const currentGroupOption = groupOptionMap.get(topic.groupId);

    if (!currentGroupOption) {
      groupOptionMap.set(topic.groupId, {
        id: topic.groupId,
        name: topic.groupName,
        topicCount: 1,
      });
      continue;
    }

    currentGroupOption.topicCount += 1;
  }

  const groupOptions = [...groupOptionMap.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
  );
  const topicOptions = topics.map((topic) => ({
    id: topic.id,
    groupId: topic.groupId,
    name: topic.name,
    videoCount: topic.videos.length,
  }));

  let groupValue = groupOptions.some((option) => option.id === requestedGroupValue)
    ? requestedGroupValue
    : "";
  let topicValue = topicOptions.some((option) => option.id === requestedTopicValue)
    ? requestedTopicValue
    : "";
  const requestedTopic = topicValue
    ? topics.find((topic) => topic.id === topicValue) ?? null
    : null;

  if (requestedTopic) {
    if (groupValue && requestedTopic.groupId !== groupValue) {
      topicValue = "";
    } else {
      groupValue = requestedTopic.groupId;
    }
  }

  if (!groupValue && groupOptions.length === 1) {
    groupValue = groupOptions[0]?.id ?? "";
  }

  const availableTopicOptions = groupValue
    ? topicOptions.filter((option) => option.groupId === groupValue)
    : topicOptions;

  if (topicValue && !availableTopicOptions.some((option) => option.id === topicValue)) {
    topicValue = "";
  }

  let tablatureError: string | null = null;

  if (topicValue) {
    const activeTopicIndex = topics.findIndex((topic) => topic.id === topicValue);

    if (activeTopicIndex >= 0) {
      const tablatureResult = await getTopicTablatureImages(supabase, topicValue);

      tablatureError = tablatureResult.error;
      topics = topics.map((topic, index) =>
        index === activeTopicIndex
          ? { ...topic, tablatureImages: tablatureResult.images }
          : topic,
      );
    }
  }

  return {
    topics,
    configured: true,
    error: tablatureError,
    totalVideoCount: topics.reduce(
      (accumulator, topic) => accumulator + topic.videos.length,
      0,
    ),
    totalTopicCount: topics.length,
    totalGroupCount: groupOptions.length,
    groupValue,
    topicValue,
    groupOptions,
    topicOptions,
  };
}

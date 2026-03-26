import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const GUITAR_TOPICS_SELECT_COLUMNS =
  "id, grupo_id, nombre, observaciones, grupo:grupos!temas_grupo_id_fkey(nombre)";
const GUITAR_TOPIC_VIDEOS_SELECT_COLUMNS =
  "id, tema_id, enlace, observaciones";

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

export type GuitarTopicAsset = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  observations: string | null;
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

  const topics = topicRows
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

  return {
    topics,
    configured: true,
    error: null,
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

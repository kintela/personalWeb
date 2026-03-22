import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const VINILOS_SELECT_COLUMNS =
  "id, titulo, year_publicacion, caratula, grupo_id, created_at, updated_at, grupo:grupos!vinilos_grupo_id_fkey(nombre)";
const VINILO_COVER_BUCKET = "caratulas";
const VINILO_COVER_FOLDER = "vinilos";

type ViniloGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type ViniloDatabaseRow = {
  id: number | string;
  titulo: string;
  year_publicacion: number | null;
  caratula: string | null;
  grupo_id: number | string | null;
  created_at: string | null;
  updated_at: string | null;
  grupo: ViniloGroupRelation;
};

export type ViniloAsset = {
  id: string;
  title: string;
  year: number | null;
  cover: string | null;
  coverSrc: string | null;
  groupId: string | null;
  groupName: string | null;
};

export type ViniloListResult = {
  vinilos: ViniloAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
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

function getViniloGroupName(group: ViniloGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

export function getViniloCoverPublicUrl(coverPath: string | null) {
  const normalizedPath = coverPath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const withoutLeadingSlash = normalizedPath.replace(/^\/+/, "");
  const pathWithoutBucket = withoutLeadingSlash.startsWith(
    `${VINILO_COVER_BUCKET}/`,
  )
    ? withoutLeadingSlash.slice(VINILO_COVER_BUCKET.length + 1)
    : withoutLeadingSlash;
  const objectPath = pathWithoutBucket.startsWith(`${VINILO_COVER_FOLDER}/`)
    ? pathWithoutBucket
    : `${VINILO_COVER_FOLDER}/${pathWithoutBucket}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(VINILO_COVER_BUCKET)}/${encodedPath}`;
}

function compareViniloRows(left: ViniloDatabaseRow, right: ViniloDatabaseRow) {
  const leftGroupName = getViniloGroupName(left.grupo);
  const rightGroupName = getViniloGroupName(right.grupo);

  if (leftGroupName && rightGroupName) {
    const byGroup = leftGroupName.localeCompare(rightGroupName, "es", {
      sensitivity: "base",
    });

    if (byGroup !== 0) {
      return byGroup;
    }
  } else if (leftGroupName) {
    return -1;
  } else if (rightGroupName) {
    return 1;
  }

  const byTitle = left.titulo.trim().localeCompare(right.titulo.trim(), "es", {
    sensitivity: "base",
  });

  if (byTitle !== 0) {
    return byTitle;
  }

  const leftYear = left.year_publicacion;
  const rightYear = right.year_publicacion;

  if (
    typeof leftYear === "number" &&
    typeof rightYear === "number" &&
    leftYear !== rightYear
  ) {
    return leftYear - rightYear;
  }

  return String(left.id).localeCompare(String(right.id), "es", {
    numeric: true,
  });
}

function mapVinilo(row: ViniloDatabaseRow): ViniloAsset {
  return {
    id: String(row.id),
    title: row.titulo.trim(),
    year: row.year_publicacion,
    cover: row.caratula?.trim() || null,
    coverSrc: getViniloCoverPublicUrl(row.caratula),
    groupId:
      row.grupo_id === null || row.grupo_id === undefined
        ? null
        : String(row.grupo_id),
    groupName: getViniloGroupName(row.grupo),
  };
}

export async function getViniloList(): Promise<ViniloListResult> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      vinilos: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("vinilos")
    .select(VINILOS_SELECT_COLUMNS)
    .order("titulo", { ascending: true });

  if (error) {
    return {
      vinilos: [],
      configured: true,
      error: `No he podido leer los vinilos: ${error.message}`,
      totalCount: 0,
    };
  }

  const rows = (data as ViniloDatabaseRow[] | null) ?? [];
  const sortedRows = [...rows].sort(compareViniloRows);

  return {
    vinilos: sortedRows.map(mapVinilo),
    configured: true,
    error: null,
    totalCount: sortedRows.length,
  };
}

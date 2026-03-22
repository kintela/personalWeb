import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CDS_SELECT_COLUMNS =
  "id, titulo, year_publicacion, is_in_spotify, etiqueta, caratula, firmado, grupo_id, created_at, updated_at, grupo:grupos!cds_grupo_id_fkey(nombre)";
const CD_COVER_BUCKET = "caratulas";
const CD_COVER_FOLDER = "cds";

type CdGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type CdDatabaseRow = {
  id: number | string;
  titulo: string;
  year_publicacion: number | null;
  is_in_spotify: boolean | null;
  etiqueta: number | string;
  caratula: string | null;
  firmado: boolean | null;
  grupo_id: number | string;
  created_at: string | null;
  updated_at: string | null;
  grupo: CdGroupRelation;
};

export type CdAsset = {
  id: string;
  title: string;
  year: number | null;
  inSpotify: boolean | null;
  labelId: number | null;
  cover: string | null;
  coverSrc: string | null;
  signed: boolean | null;
  groupId: string;
  groupName: string | null;
};

export type CdListResult = {
  cds: CdAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  groupValue: string;
  yearValue: string;
  spotifyValue: string;
  signedValue: string;
  groupOptions: string[];
  yearOptions: string[];
};

type GetCdListOptions = {
  filterValue?: string | null;
  groupValue?: string | null;
  yearValue?: string | null;
  spotifyValue?: string | null;
  signedValue?: string | null;
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

function normalizeCdFilterValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeCdBooleanFilterValue(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLocaleLowerCase("es-ES") ?? "";

  if (["si", "sí", "true", "1", "yes"].includes(normalizedValue)) {
    return "si";
  }

  if (["no", "false", "0"].includes(normalizedValue)) {
    return "no";
  }

  return "";
}

function getCdGroupName(group: CdGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function getCdBooleanFilterValue(value: boolean | null) {
  if (value === true) {
    return "si";
  }

  if (value === false) {
    return "no";
  }

  return "";
}

function getCdYearValue(value: number | null) {
  if (!Number.isInteger(value)) {
    return "";
  }

  return String(value);
}

function parseCdLabelId(value: number | string) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseInt(value.trim(), 10);

    if (Number.isInteger(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

export function getCdCoverPublicUrl(coverPath: string | null) {
  const normalizedPath = coverPath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const withoutLeadingSlash = normalizedPath.replace(/^\/+/, "");
  const pathWithoutBucket = withoutLeadingSlash.startsWith(`${CD_COVER_BUCKET}/`)
    ? withoutLeadingSlash.slice(CD_COVER_BUCKET.length + 1)
    : withoutLeadingSlash;
  const objectPath = pathWithoutBucket.startsWith(`${CD_COVER_FOLDER}/`)
    ? pathWithoutBucket
    : `${CD_COVER_FOLDER}/${pathWithoutBucket}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(CD_COVER_BUCKET)}/${encodedPath}`;
}

function buildCdSearchHaystack(cd: CdDatabaseRow) {
  const groupName = getCdGroupName(cd.grupo);

  return [
    String(cd.id),
    cd.titulo,
    getCdYearValue(cd.year_publicacion),
    cd.is_in_spotify === true ? "spotify" : null,
    cd.is_in_spotify === false ? "fuera de spotify" : null,
    cd.is_in_spotify === true ? "si" : null,
    cd.is_in_spotify === false ? "no" : null,
    cd.firmado === true ? "firmado" : null,
    cd.firmado === false ? "sin firmar" : null,
    cd.firmado === true ? "si" : null,
    cd.firmado === false ? "no" : null,
    String(cd.etiqueta),
    cd.caratula,
    String(cd.grupo_id),
    groupName,
    cd.created_at,
    cd.updated_at,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" \n")
    .toLocaleLowerCase("es-ES");
}

function mapCd(row: CdDatabaseRow): CdAsset {
  return {
    id: String(row.id),
    title: row.titulo.trim(),
    year: row.year_publicacion,
    inSpotify: row.is_in_spotify,
    labelId: parseCdLabelId(row.etiqueta),
    cover: row.caratula?.trim() || null,
    coverSrc: getCdCoverPublicUrl(row.caratula),
    signed: row.firmado,
    groupId: String(row.grupo_id),
    groupName: getCdGroupName(row.grupo),
  };
}

export async function getCdList(
  options: GetCdListOptions = {},
): Promise<CdListResult> {
  const supabase = createSupabaseServerClient();
  const requestedFilterValue = normalizeCdFilterValue(options.filterValue);
  const requestedGroupValue = normalizeCdFilterValue(options.groupValue);
  const requestedYearValue = normalizeCdFilterValue(options.yearValue);
  const requestedSpotifyValue = normalizeCdBooleanFilterValue(
    options.spotifyValue,
  );
  const requestedSignedValue = normalizeCdBooleanFilterValue(options.signedValue);

  if (!supabase) {
    return {
      cds: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
      filterValue: requestedFilterValue,
      groupValue: requestedGroupValue,
      yearValue: requestedYearValue,
      spotifyValue: requestedSpotifyValue,
      signedValue: requestedSignedValue,
      groupOptions: [],
      yearOptions: [],
    };
  }

  const { data, error } = await supabase
    .from("cds")
    .select(CDS_SELECT_COLUMNS)
    .order("titulo", { ascending: true });

  if (error) {
    return {
      cds: [],
      configured: true,
      error: `No he podido leer los CDs: ${error.message}`,
      totalCount: 0,
      filterValue: requestedFilterValue,
      groupValue: requestedGroupValue,
      yearValue: requestedYearValue,
      spotifyValue: requestedSpotifyValue,
      signedValue: requestedSignedValue,
      groupOptions: [],
      yearOptions: [],
    };
  }

  const rows = (data as CdDatabaseRow[] | null) ?? [];
  const groupOptions = [
    ...new Set(
      rows
        .map((row) => getCdGroupName(row.grupo))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const yearOptions = [
    ...new Set(
      rows
        .map((row) => getCdYearValue(row.year_publicacion))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => Number(right) - Number(left));
  const normalizedGroupValue = groupOptions.includes(requestedGroupValue)
    ? requestedGroupValue
    : "";
  const normalizedYearValue = yearOptions.includes(requestedYearValue)
    ? requestedYearValue
    : "";
  const normalizedFilterValue = requestedFilterValue.toLocaleLowerCase("es-ES");
  const filteredRows = rows.filter((cd) => {
    const matchesGroup =
      !normalizedGroupValue || getCdGroupName(cd.grupo) === normalizedGroupValue;
    const matchesYear =
      !normalizedYearValue ||
      getCdYearValue(cd.year_publicacion) === normalizedYearValue;
    const matchesSpotify =
      !requestedSpotifyValue ||
      getCdBooleanFilterValue(cd.is_in_spotify) === requestedSpotifyValue;
    const matchesSigned =
      !requestedSignedValue ||
      getCdBooleanFilterValue(cd.firmado) === requestedSignedValue;
    const matchesSearch =
      !normalizedFilterValue ||
      buildCdSearchHaystack(cd).includes(normalizedFilterValue);

    return (
      matchesGroup &&
      matchesYear &&
      matchesSpotify &&
      matchesSigned &&
      matchesSearch
    );
  });

  return {
    cds: filteredRows.map(mapCd),
    configured: true,
    error: null,
    totalCount: filteredRows.length,
    filterValue: requestedFilterValue,
    groupValue: normalizedGroupValue,
    yearValue: normalizedYearValue,
    spotifyValue: requestedSpotifyValue,
    signedValue: requestedSignedValue,
    groupOptions,
    yearOptions,
  };
}

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DISCOS_SELECT_COLUMNS =
  "id, nombre, year_publicacion, caratula, discografica, productor, estudio, grupo_id, created_at, updated_at, grupo:grupos!discos_grupo_id_fkey(nombre)";
const DISCOS_YEAR_OBSERVACIONES_SELECT_COLUMNS =
  "year_publicacion, observaciones";
const DISCO_COVER_BUCKET = "caratulas";
const DISCO_COVER_FOLDER = "discos";

type DiscoGroupRelation =
  | {
      nombre: string | null;
    }
  | {
      nombre: string | null;
    }[]
  | null
  | undefined;

type DiscoDatabaseRow = {
  id: number | string;
  nombre: string;
  year_publicacion: number | null;
  caratula: string | null;
  discografica: string | null;
  productor: string | null;
  estudio: string | null;
  grupo_id: number | string;
  created_at: string | null;
  updated_at: string | null;
  grupo: DiscoGroupRelation;
};

type DiscoYearObservationRow = {
  year_publicacion: number | null;
  observaciones: string | null;
};

type DiscoGroupRow = {
  id: number | string | null;
  nombre: string | null;
};

export type DiscoAsset = {
  id: string;
  title: string;
  year: number | null;
  cover: string | null;
  coverSrc: string | null;
  label: string | null;
  producer: string | null;
  studio: string | null;
  groupId: string;
  groupName: string | null;
};

export type DiscoGroupOption = {
  id: string;
  name: string;
};

export type DiscoListResult = {
  discos: DiscoAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  yearObservations: Record<string, string>;
  filterValue: string;
  groupValue: string;
  yearValue: string;
  groupOptions: string[];
  yearOptions: string[];
};

type GetDiscoListOptions = {
  filterValue?: string | null;
  groupValue?: string | null;
  yearValue?: string | null;
};

type UpdateDiscoDetailsOptions = {
  id: number;
  nombre: string;
  yearPublicacion: number;
  discografica: string;
  productor: string;
  estudio: string | null;
  groupId: number;
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

function normalizeDiscoFilterValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function getDiscoGroupName(group: DiscoGroupRelation) {
  if (!group) {
    return null;
  }

  if (Array.isArray(group)) {
    return group[0]?.nombre?.trim() || null;
  }

  return group.nombre?.trim() || null;
}

function getDiscoYearValue(value: number | null) {
  if (!Number.isInteger(value)) {
    return "";
  }

  return String(value);
}

export function getDiscoCoverPublicUrl(coverPath: string | null) {
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
    `${DISCO_COVER_BUCKET}/`,
  )
    ? withoutLeadingSlash.slice(DISCO_COVER_BUCKET.length + 1)
    : withoutLeadingSlash;
  const objectPath = pathWithoutBucket.startsWith(`${DISCO_COVER_FOLDER}/`)
    ? pathWithoutBucket
    : `${DISCO_COVER_FOLDER}/${pathWithoutBucket}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(DISCO_COVER_BUCKET)}/${encodedPath}`;
}

export function getDiscoCoverBucketName() {
  return DISCO_COVER_BUCKET;
}

export function getDiscoCoverFolderName() {
  return DISCO_COVER_FOLDER;
}

function buildDiscoSearchHaystack(disco: DiscoDatabaseRow) {
  const groupName = getDiscoGroupName(disco.grupo);

  return [
    String(disco.id),
    disco.nombre,
    getDiscoYearValue(disco.year_publicacion),
    disco.caratula,
    disco.discografica,
    disco.productor,
    disco.estudio,
    String(disco.grupo_id),
    groupName,
    disco.created_at,
    disco.updated_at,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" \n")
    .toLocaleLowerCase("es-ES");
}

function compareDiscoRows(left: DiscoDatabaseRow, right: DiscoDatabaseRow) {
  const leftYear = left.year_publicacion;
  const rightYear = right.year_publicacion;

  if (
    typeof leftYear === "number" &&
    typeof rightYear === "number" &&
    leftYear !== rightYear
  ) {
    return leftYear - rightYear;
  }

  const leftGroupName = getDiscoGroupName(left.grupo);
  const rightGroupName = getDiscoGroupName(right.grupo);

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

  const byTitle = left.nombre.trim().localeCompare(right.nombre.trim(), "es", {
    sensitivity: "base",
  });

  if (byTitle !== 0) {
    return byTitle;
  }

  return String(left.id).localeCompare(String(right.id), "es", {
    numeric: true,
  });
}

function mapDisco(row: DiscoDatabaseRow): DiscoAsset {
  return {
    id: String(row.id),
    title: row.nombre.trim(),
    year: row.year_publicacion,
    cover: row.caratula?.trim() || null,
    coverSrc: getDiscoCoverPublicUrl(row.caratula),
    label: row.discografica?.trim() || null,
    producer: row.productor?.trim() || null,
    studio: row.estudio?.trim() || null,
    groupId: String(row.grupo_id),
    groupName: getDiscoGroupName(row.grupo),
  };
}

function mapDiscoYearObservations(rows: DiscoYearObservationRow[] | null) {
  const observations: Record<string, string> = {};

  for (const row of rows ?? []) {
    const yearKey = getDiscoYearValue(row.year_publicacion);
    const observation = row.observaciones?.trim();

    if (!yearKey || !observation) {
      continue;
    }

    observations[yearKey] = observation;
  }

  return observations;
}

export async function getDiscoList(
  options: GetDiscoListOptions = {},
): Promise<DiscoListResult> {
  const supabase = createSupabaseServerClient();
  const requestedFilterValue = normalizeDiscoFilterValue(options.filterValue);
  const requestedGroupValue = normalizeDiscoFilterValue(options.groupValue);
  const requestedYearValue = normalizeDiscoFilterValue(options.yearValue);

  if (!supabase) {
    return {
      discos: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
      yearObservations: {},
      filterValue: requestedFilterValue,
      groupValue: requestedGroupValue,
      yearValue: requestedYearValue,
      groupOptions: [],
      yearOptions: [],
    };
  }

  const [{ data, error }, { data: yearObservationData }] = await Promise.all([
    supabase
      .from("discos")
      .select(DISCOS_SELECT_COLUMNS)
      .order("year_publicacion", { ascending: true })
      .order("nombre", { ascending: true }),
    supabase
      .from("discos_year_observaciones")
      .select(DISCOS_YEAR_OBSERVACIONES_SELECT_COLUMNS)
      .order("year_publicacion", { ascending: true }),
  ]);

  if (error) {
    return {
      discos: [],
      configured: true,
      error: `No he podido leer los discos: ${error.message}`,
      totalCount: 0,
      yearObservations: {},
      filterValue: requestedFilterValue,
      groupValue: requestedGroupValue,
      yearValue: requestedYearValue,
      groupOptions: [],
      yearOptions: [],
    };
  }

  const rows = (data as DiscoDatabaseRow[] | null) ?? [];
  const yearObservations = mapDiscoYearObservations(
    (yearObservationData as DiscoYearObservationRow[] | null) ?? null,
  );
  const groupOptions = [
    ...new Set(
      rows
        .map((row) => getDiscoGroupName(row.grupo))
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const yearOptions = [
    ...new Set(
      rows
        .map((row) => getDiscoYearValue(row.year_publicacion))
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
  const filteredRows = rows.filter((disco) => {
    const matchesGroup =
      !normalizedGroupValue ||
      getDiscoGroupName(disco.grupo) === normalizedGroupValue;
    const matchesYear =
      !normalizedYearValue ||
      getDiscoYearValue(disco.year_publicacion) === normalizedYearValue;
    const matchesSearch =
      !normalizedFilterValue ||
      buildDiscoSearchHaystack(disco).includes(normalizedFilterValue);

    return matchesGroup && matchesYear && matchesSearch;
  });

  const sortedRows = [...filteredRows].sort(compareDiscoRows);

  return {
    discos: sortedRows.map(mapDisco),
    configured: true,
    error: null,
    totalCount: sortedRows.length,
    yearObservations,
    filterValue: requestedFilterValue,
    groupValue: normalizedGroupValue,
    yearValue: normalizedYearValue,
    groupOptions,
    yearOptions,
  };
}

export async function getDiscoGroupOptions(): Promise<DiscoGroupOption[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("grupos")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    return [];
  }

  const rows = (data as DiscoGroupRow[] | null) ?? [];

  return rows.flatMap((row) => {
    const idValue = row.id;
    const nameValue = row.nombre?.trim() ?? "";

    if ((typeof idValue !== "number" && typeof idValue !== "string") || !nameValue) {
      return [];
    }

    return [
      {
        id: String(idValue),
        name: nameValue,
      } satisfies DiscoGroupOption,
    ];
  });
}

export async function updateDiscoDetails(
  options: UpdateDiscoDetailsOptions,
) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      notFound: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
    };
  }

  const { data, error } = await supabase
    .from("discos")
    .update({
      nombre: options.nombre,
      year_publicacion: options.yearPublicacion,
      discografica: options.discografica,
      productor: options.productor,
      estudio: options.estudio,
      grupo_id: options.groupId,
    })
    .eq("id", options.id)
    .select(DISCOS_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      notFound: false,
      error: `No he podido actualizar el disco: ${error.message}`,
    };
  }

  if (!data) {
    return {
      ok: false as const,
      notFound: true,
      error: "No he encontrado el disco que querías actualizar.",
    };
  }

  return {
    ok: true as const,
    disco: mapDisco(data as DiscoDatabaseRow),
  };
}

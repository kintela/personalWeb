import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_SEEDS_DIR,
  PROJECT_ROOT,
  buildMissingGroupsSeed,
  escapeSql,
  extractExportedArray,
  getCanonicalGroupName,
  loadSeededGroups,
  normalizeGroupName,
  toSqlBoolean,
  toSqlDate,
  toSqlInteger,
  toSqlText,
  toSqlTextArray,
} from "./lib/legacy-seed-utils.mjs";

const INPUT_PATH = process.argv[2];
const OUTPUT_DIR = process.argv[3]
  ? path.resolve(process.argv[3])
  : DEFAULT_SEEDS_DIR;

if (!INPUT_PATH) {
  console.error(
    "Usage: node scripts/generate-conciertos-seed.mjs <path-to-conciertos.ts|json> [output-dir]",
  );
  process.exit(1);
}

const SOURCE_PATH = path.resolve(INPUT_PATH);
const source = fs.readFileSync(SOURCE_PATH, "utf8");
const conciertos = extractExportedArray(source, "conciertos");

if (!Array.isArray(conciertos)) {
  throw new Error("Could not extract an array of conciertos from the source file.");
}

const seededGroups = loadSeededGroups(path.join(PROJECT_ROOT, "supabase/seeds"));
const missingGroups = new Set();
const concertsWithIds = [];
const concertsWithoutIds = [];

for (const item of conciertos) {
  const canonicalGroupName = getCanonicalGroupName(item.grupo, seededGroups);

  if (
    canonicalGroupName &&
    !seededGroups.has(normalizeGroupName(canonicalGroupName))
  ) {
    missingGroups.add(canonicalGroupName);
  }

  const videos = Array.isArray(item.videos)
    ? item.videos.map((value) => String(value))
    : [];
  const videosInstagram = Array.isArray(item.videosInstagram)
    ? item.videosInstagram.map((value) => String(value))
    : [];

  const record = {
    id: Number.isInteger(item.id) ? item.id : null,
    fecha: item.fecha instanceof Date ? item.fecha : null,
    sala: item.sala ?? null,
    ciudad: item.ciudad ?? null,
    canonicalGroupName,
    festival: Boolean(item.festival),
    fotos: Boolean(item.fotos),
    entrada: item.entrada ?? null,
    descripcion: item.descripcion ?? null,
    cartel: item.cartel ?? null,
    cronica: item.cronica ?? null,
    videos,
    videosInstagram,
  };

  if (!(record.fecha instanceof Date) || Number.isNaN(record.fecha.getTime())) {
    throw new Error(
      `Concert "${item.grupo ?? item.id ?? "unknown"}" is missing a valid fecha.`,
    );
  }

  if (record.id === null) {
    concertsWithoutIds.push(record);
  } else {
    concertsWithIds.push(record);
  }
}

const groupIdExpression = (canonicalGroupName) =>
  canonicalGroupName
    ? `(select id from public.grupos where nombre = '${escapeSql(canonicalGroupName)}' limit 1)`
    : "null";

const sortedConcertsWithIds = [...concertsWithIds].sort(
  (left, right) => left.id - right.id,
);

const withIdRows = sortedConcertsWithIds
  .map(
    (item) =>
      `  select ${toSqlInteger(item.id)}::integer as id, ${toSqlDate(
        item.fecha,
      )}::date as fecha, ${toSqlText(item.sala)}::text as sala, ${toSqlText(
        item.ciudad,
      )}::text as ciudad, ${groupIdExpression(
        item.canonicalGroupName,
      )}::bigint as grupo_id, ${toSqlBoolean(item.festival)}::boolean as festival, ${toSqlBoolean(
        item.fotos,
      )}::boolean as fotos, ${toSqlText(item.entrada)}::text as entrada, ${toSqlText(
        item.descripcion,
      )}::text as descripcion, ${toSqlText(item.cartel)}::text as cartel, ${toSqlText(
        item.cronica,
      )}::text as cronica, ${toSqlTextArray(item.videos)} as videos, ${toSqlTextArray(
        item.videosInstagram,
      )} as videos_instagram`,
  )
  .join("\n  union all\n");

const withoutIdRows = concertsWithoutIds
  .sort((left, right) => left.fecha - right.fecha)
  .map(
    (item) =>
      `  select ${toSqlDate(item.fecha)}::date as fecha, ${toSqlText(
        item.sala,
      )}::text as sala, ${toSqlText(item.ciudad)}::text as ciudad, ${groupIdExpression(
        item.canonicalGroupName,
      )}::bigint as grupo_id, ${toSqlBoolean(item.festival)}::boolean as festival, ${toSqlBoolean(
        item.fotos,
      )}::boolean as fotos, ${toSqlText(item.entrada)}::text as entrada, ${toSqlText(
        item.descripcion,
      )}::text as descripcion, ${toSqlText(item.cartel)}::text as cartel, ${toSqlText(
        item.cronica,
      )}::text as cronica, ${toSqlTextArray(item.videos)} as videos, ${toSqlTextArray(
        item.videosInstagram,
      )} as videos_instagram`,
  )
  .join("\n  union all\n");

const missingGroupsFile = path.join(
  OUTPUT_DIR,
  "20260319_seed_grupos_missing_from_conciertos.sql",
);
const conciertosFile = path.join(OUTPUT_DIR, "20260319_seed_conciertos.sql");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(missingGroupsFile, buildMissingGroupsSeed(missingGroups));

const withIdsSql =
  concertsWithIds.length === 0
    ? "-- No concerts with legacy ids detected.\n"
    : `with source as (\n${withIdRows}\n),\nupdated as (\n  update public.conciertos as target\n  set\n    fecha = source.fecha,\n    sala = source.sala,\n    ciudad = source.ciudad,\n    grupo_id = source.grupo_id,\n    festival = source.festival,\n    fotos = source.fotos,\n    entrada = source.entrada,\n    descripcion = source.descripcion,\n    cartel = source.cartel,\n    cronica = source.cronica,\n    videos = source.videos,\n    videos_instagram = source.videos_instagram\n  from source\n  where target.id = source.id\n  returning target.id\n)\ninsert into public.conciertos (\n  id,\n  fecha,\n  sala,\n  ciudad,\n  grupo_id,\n  festival,\n  fotos,\n  entrada,\n  descripcion,\n  cartel,\n  cronica,\n  videos,\n  videos_instagram\n)\nselect\n  source.id,\n  source.fecha,\n  source.sala,\n  source.ciudad,\n  source.grupo_id,\n  source.festival,\n  source.fotos,\n  source.entrada,\n  source.descripcion,\n  source.cartel,\n  source.cronica,\n  source.videos,\n  source.videos_instagram\nfrom source\nleft join updated on updated.id = source.id\nwhere updated.id is null\non conflict (id) do nothing;\n`;

const withoutIdsSql =
  concertsWithoutIds.length === 0
    ? "-- No concerts without legacy ids detected.\n"
    : `with source as (\n${withoutIdRows}\n)\ninsert into public.conciertos (\n  fecha,\n  sala,\n  ciudad,\n  grupo_id,\n  festival,\n  fotos,\n  entrada,\n  descripcion,\n  cartel,\n  cronica,\n  videos,\n  videos_instagram\n)\nselect\n  source.fecha,\n  source.sala,\n  source.ciudad,\n  source.grupo_id,\n  source.festival,\n  source.fotos,\n  source.entrada,\n  source.descripcion,\n  source.cartel,\n  source.cronica,\n  source.videos,\n  source.videos_instagram\nfrom source\nwhere not exists (\n  select 1\n  from public.conciertos existing\n  where existing.fecha = source.fecha\n    and coalesce(existing.sala, '') = coalesce(source.sala, '')\n    and coalesce(existing.ciudad, '') = coalesce(source.ciudad, '')\n    and coalesce(existing.grupo_id, 0) = coalesce(source.grupo_id, 0)\n);\n`;

const resetSequenceSql = `select setval(\n  pg_get_serial_sequence('public.conciertos', 'id'),\n  coalesce((select max(id) from public.conciertos), 1),\n  true\n);\n`;

fs.writeFileSync(
  conciertosFile,
  `begin;\n\n${withIdsSql}\n${resetSequenceSql}\n${withoutIdsSql}\n${resetSequenceSql}\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: SOURCE_PATH,
      totalRecords: conciertos.length,
      withLegacyId: concertsWithIds.length,
      withoutLegacyId: concertsWithoutIds.length,
      missingGroups: [...missingGroups].sort((left, right) =>
        left.localeCompare(right, "es", { sensitivity: "base" }),
      ),
      outputs: {
        missingGroupsFile,
        conciertosFile,
      },
    },
    null,
    2,
  ),
);

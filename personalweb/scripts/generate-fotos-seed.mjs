import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_SEEDS_DIR,
  PROJECT_ROOT,
  buildMissingGroupsSeed,
  escapeSql,
  extractSeedGroupNames,
  extractExportedArray,
  getCanonicalGroupName,
  normalizeGroupName,
  splitPeople,
  toSqlDate,
  toSqlInteger,
  toSqlText,
  toSqlTextArray,
} from "./lib/legacy-seed-utils.mjs";

function parseCliArgs(argv) {
  const positional = [];
  const options = new Map();

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=", 2);

    if (!rawKey) {
      continue;
    }

    options.set(rawKey, rawValue ?? "true");
  }

  return { positional, options };
}

function inferExportName(inputPath) {
  return path.basename(inputPath, path.extname(inputPath));
}

function inferFileSuffix(exportName) {
  const legacyMatch = exportName.match(/^memorabilias(\d*)$/i);

  if (legacyMatch) {
    return legacyMatch[1] ? `_${legacyMatch[1]}` : "";
  }

  const normalized = exportName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized ? `_${normalized}` : "";
}

function loadSeededConcertIds(seedsDir) {
  const concertIds = new Set();

  if (!fs.existsSync(seedsDir)) {
    return concertIds;
  }

  const concertSeedFiles = fs
    .readdirSync(seedsDir)
    .filter((file) => file.includes("seed_conciertos") && file.endsWith(".sql"))
    .sort();

  for (const file of concertSeedFiles) {
    const content = fs.readFileSync(path.join(seedsDir, file), "utf8");

    for (const match of content.matchAll(/select\s+(\d+)::integer\s+as\s+id/gi)) {
      concertIds.add(Number(match[1]));
    }
  }

  return concertIds;
}

function loadSeededGroupsExcluding(seedsDir, excludedFiles = new Set()) {
  const names = new Map();

  if (!fs.existsSync(seedsDir)) {
    return names;
  }

  const groupSeedFiles = fs
    .readdirSync(seedsDir)
    .filter(
      (file) =>
        file.includes("seed_grupos") &&
        !file.includes("seed_grupos_missing_from_fotos") &&
        file.endsWith(".sql") &&
        !excludedFiles.has(file),
    )
    .sort();

  for (const file of groupSeedFiles) {
    const filePath = path.join(seedsDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    for (const [normalized, rawName] of extractSeedGroupNames(content)) {
      names.set(normalized, rawName);
    }
  }

  return names;
}

const { positional, options } = parseCliArgs(process.argv.slice(2));
const INPUT_PATH = positional[0];
const OUTPUT_DIR = positional[1] ? path.resolve(positional[1]) : DEFAULT_SEEDS_DIR;

if (!INPUT_PATH) {
  console.error(
    "Usage: node scripts/generate-fotos-seed.mjs <path-to-memorabilias.ts|json> [output-dir] [--export=<name>] [--suffix=<suffix>]",
  );
  process.exit(1);
}

const SOURCE_PATH = path.resolve(INPUT_PATH);
const EXPORT_NAME = options.get("export") ?? inferExportName(SOURCE_PATH);
const FILE_SUFFIX = options.get("suffix") ?? inferFileSuffix(EXPORT_NAME);

const source = fs.readFileSync(SOURCE_PATH, "utf8");
const memorabilias = extractExportedArray(source, EXPORT_NAME);

if (!Array.isArray(memorabilias)) {
  throw new Error("Could not extract an array of memorabilias from the source file.");
}

const missingGroupsFile = path.join(
  OUTPUT_DIR,
  `20260319_seed_grupos_missing_from_fotos${FILE_SUFFIX}.sql`,
);
const fotosFile = path.join(OUTPUT_DIR, `20260319_seed_fotos${FILE_SUFFIX}.sql`);
const seedsDir = path.join(PROJECT_ROOT, "supabase/seeds");
const seededGroups = loadSeededGroupsExcluding(seedsDir, new Set([path.basename(missingGroupsFile)]));
const seededConcertIds = loadSeededConcertIds(seedsDir);

const missingGroups = new Set();
const unresolvedConcertIds = new Set();
const seenImages = new Map();
const duplicateImages = new Set();
const fotoValues = memorabilias.map((item, index) => {
  const canonicalGroupName = getCanonicalGroupName(item.grupo, seededGroups);

  if (
    canonicalGroupName &&
    !seededGroups.has(normalizeGroupName(canonicalGroupName))
  ) {
    missingGroups.add(canonicalGroupName);
  }

  const people = splitPeople(item.personas);
  const dateValue = item.fecha instanceof Date ? item.fecha : null;
  const concertId =
    Number.isInteger(item.conciertoId) && seededConcertIds.has(item.conciertoId)
      ? item.conciertoId
      : null;
  const yearValue =
    Number.isInteger(item.year) ? item.year : dateValue ? dateValue.getUTCFullYear() : null;

  if (Number.isInteger(item.conciertoId) && concertId == null) {
    unresolvedConcertIds.add(item.conciertoId);
  }

  const imageKey = `fotos:${String(item.imagen ?? "")}`;

  if (seenImages.has(imageKey)) {
    duplicateImages.add(String(item.imagen ?? ""));
  } else {
    seenImages.set(imageKey, index);
  }

  return `  (${index + 1}, ${toSqlText("fotos")}, ${toSqlText(item.imagen)}, ${toSqlText(
    item.titulo,
  )}, ${toSqlTextArray(people)}, ${toSqlInteger(yearValue)}, ${
    canonicalGroupName
      ? `(select id from public.grupos where nombre = '${escapeSql(canonicalGroupName)}' limit 1)`
      : "null"
  }, ${toSqlText(item.origen ?? null)}, ${toSqlText(item.descripcion ?? null)}, ${toSqlDate(
    dateValue,
  )}::date, ${toSqlText(item.lugar ?? null)}, ${toSqlText(item.categoria ?? null)}, ${toSqlInteger(
    concertId,
  )})`;
});

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(
  missingGroupsFile,
  buildMissingGroupsSeed(missingGroups),
);

fs.writeFileSync(
  fotosFile,
  `begin;\n\nwith source (\n  ord,\n  bucket,\n  imagen,\n  titulo,\n  personas,\n  anio,\n  grupo_id,\n  origen,\n  descripcion,\n  fecha,\n  lugar,\n  categoria,\n  concierto_id\n) as (\n  values\n${fotoValues.join(
    ",\n",
  )}\n),\ndeduped as (\n  select distinct on (bucket, imagen)\n    bucket,\n    imagen,\n    titulo,\n    personas,\n    anio,\n    grupo_id,\n    origen,\n    descripcion,\n    fecha,\n    lugar,\n    categoria,\n    concierto_id\n  from source\n  order by bucket, imagen, ord desc\n)\ninsert into public.fotos (\n  bucket,\n  imagen,\n  titulo,\n  personas,\n  anio,\n  grupo_id,\n  origen,\n  descripcion,\n  fecha,\n  lugar,\n  categoria,\n  concierto_id\n)\nselect\n  bucket,\n  imagen,\n  titulo,\n  personas,\n  anio,\n  grupo_id,\n  origen,\n  descripcion,\n  fecha,\n  lugar,\n  categoria,\n  concierto_id\nfrom deduped\non conflict (bucket, imagen) do update\nset\n  titulo = excluded.titulo,\n  personas = excluded.personas,\n  anio = excluded.anio,\n  grupo_id = excluded.grupo_id,\n  origen = excluded.origen,\n  descripcion = excluded.descripcion,\n  fecha = excluded.fecha,\n  lugar = excluded.lugar,\n  categoria = excluded.categoria,\n  concierto_id = excluded.concierto_id;\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: SOURCE_PATH,
      exportName: EXPORT_NAME,
      fileSuffix: FILE_SUFFIX,
      totalRecords: memorabilias.length,
      missingGroups: [...missingGroups].sort((left, right) =>
        left.localeCompare(right, "es", { sensitivity: "base" }),
      ),
      duplicateImages: [...duplicateImages].sort((left, right) =>
        left.localeCompare(right, "es", { sensitivity: "base" }),
      ),
      unresolvedConcertIds: [...unresolvedConcertIds].sort((left, right) => left - right),
      outputs: {
        missingGroupsFile,
        fotosFile,
      },
    },
    null,
    2,
  ),
);

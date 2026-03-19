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
  splitPeople,
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
    "Usage: node scripts/generate-fotos-seed.mjs <path-to-memorabilias.ts|json> [output-dir]",
  );
  process.exit(1);
}

const SOURCE_PATH = path.resolve(INPUT_PATH);

const source = fs.readFileSync(SOURCE_PATH, "utf8");
const memorabilias = extractExportedArray(source, "memorabilias");

if (!Array.isArray(memorabilias)) {
  throw new Error("Could not extract an array of memorabilias from the source file.");
}

const seededGroups = loadSeededGroups(path.join(PROJECT_ROOT, "supabase/seeds"));

const missingGroups = new Set();
const fotoValues = memorabilias.map((item) => {
  const canonicalGroupName = getCanonicalGroupName(item.grupo, seededGroups);

  if (
    canonicalGroupName &&
    !seededGroups.has(normalizeGroupName(canonicalGroupName))
  ) {
    missingGroups.add(canonicalGroupName);
  }

  const people = splitPeople(item.personas);
  const dateValue = item.fecha instanceof Date ? item.fecha : null;
  const yearValue =
    Number.isInteger(item.year) ? item.year : dateValue ? dateValue.getUTCFullYear() : null;

  return `  (${toSqlText("fotos")}, ${toSqlText(item.imagen)}, ${toSqlText(item.titulo)}, ${toSqlTextArray(
    people,
  )}, ${toSqlInteger(yearValue)}, ${
    canonicalGroupName
      ? `(select id from public.grupos where nombre = '${escapeSql(canonicalGroupName)}' limit 1)`
      : "null"
  }, ${toSqlText(item.origen ?? null)}, ${toSqlText(item.descripcion ?? null)}, ${toSqlDate(
    dateValue,
  )}, ${toSqlText(item.lugar ?? null)}, ${toSqlText(item.categoria ?? null)}, ${toSqlInteger(
    Number.isInteger(item.conciertoId) ? item.conciertoId : null,
  )})`;
});

const missingGroupsFile = path.join(
  OUTPUT_DIR,
  "20260319_seed_grupos_missing_from_fotos.sql",
);
const fotosFile = path.join(OUTPUT_DIR, "20260319_seed_fotos.sql");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(
  missingGroupsFile,
  buildMissingGroupsSeed(missingGroups),
);

fs.writeFileSync(
  fotosFile,
  `begin;\n\ninsert into public.fotos (\n  bucket,\n  imagen,\n  titulo,\n  personas,\n  anio,\n  grupo_id,\n  origen,\n  descripcion,\n  fecha,\n  lugar,\n  categoria,\n  concierto_id\n)\nvalues\n${fotoValues.join(
    ",\n",
  )}\non conflict (bucket, imagen) do update\nset\n  titulo = excluded.titulo,\n  personas = excluded.personas,\n  anio = excluded.anio,\n  grupo_id = excluded.grupo_id,\n  origen = excluded.origen,\n  descripcion = excluded.descripcion,\n  fecha = excluded.fecha,\n  lugar = excluded.lugar,\n  categoria = excluded.categoria,\n  concierto_id = excluded.concierto_id;\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: SOURCE_PATH,
      totalRecords: memorabilias.length,
      missingGroups: [...missingGroups].sort((left, right) =>
        left.localeCompare(right, "es", { sensitivity: "base" }),
      ),
      outputs: {
        missingGroupsFile,
        fotosFile,
      },
    },
    null,
    2,
  ),
);

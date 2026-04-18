import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_SEEDS_DIR,
  toSqlInteger,
  toSqlText,
} from "./lib/legacy-seed-utils.mjs";

const INPUT_PATH = process.argv[2];
const OUTPUT_DIR = process.argv[3]
  ? path.resolve(process.argv[3])
  : DEFAULT_SEEDS_DIR;
const OUTPUT_PATH = path.join(OUTPUT_DIR, "20260414_seed_discos.sql");

if (!INPUT_PATH) {
  console.error(
    "Usage: node scripts/generate-discos-seed.mjs <path-to-results.json> [output-dir]",
  );
  process.exit(1);
}

function parseRequiredInteger(value, fieldName, index) {
  const parsedValue = Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isInteger(parsedValue)) {
    throw new Error(
      `Disco at index ${index} is missing a valid ${fieldName}.`,
    );
  }

  return parsedValue;
}

function parseRequiredText(value, fieldName, index) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw new Error(`Disco at index ${index} is missing ${fieldName}.`);
  }

  return normalizedValue;
}

function parseOptionalText(value) {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue || null;
}

const sourcePath = path.resolve(INPUT_PATH);
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source)) {
  throw new Error("Expected a JSON array of disco records.");
}

const discos = source
  .map((item, index) => ({
    id: parseRequiredInteger(item.DiscoId, "DiscoId", index),
    nombre: parseRequiredText(item.Nombre, "Nombre", index),
    yearPublicacion: parseRequiredInteger(
      item.YearPublicacion,
      "YearPublicacion",
      index,
    ),
    caratula: parseRequiredText(item.Caratula, "Caratula", index),
    discografica: parseRequiredText(
      item.Discografica,
      "Discografica",
      index,
    ),
    productor: parseRequiredText(item.Productor, "Productor", index),
    estudio: parseOptionalText(item.Estudio),
    grupoId: parseRequiredInteger(item.GrupoId, "GrupoId", index),
  }))
  .sort((left, right) => left.id - right.id);

const values = discos
  .map(
    (item) =>
      `  (${toSqlInteger(item.id)}::integer, ${toSqlText(
        item.nombre,
      )}::text, ${toSqlInteger(item.yearPublicacion)}::integer, ${toSqlText(
        item.caratula,
      )}::text, ${toSqlText(item.discografica)}::text, ${toSqlText(
        item.productor,
      )}::text, ${toSqlText(item.estudio)}::text, ${toSqlInteger(item.grupoId)}::bigint)`,
  )
  .join(",\n");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(
  OUTPUT_PATH,
  `begin;\n\nwith source (\n  id,\n  nombre,\n  year_publicacion,\n  caratula,\n  discografica,\n  productor,\n  estudio,\n  grupo_id\n) as (\n  values\n${values}\n)\ninsert into public.discos (\n  id,\n  nombre,\n  year_publicacion,\n  caratula,\n  discografica,\n  productor,\n  estudio,\n  grupo_id\n)\noverriding system value\nselect\n  id,\n  nombre,\n  year_publicacion,\n  caratula,\n  discografica,\n  productor,\n  estudio,\n  grupo_id\nfrom source\non conflict (id) do update\nset\n  nombre = excluded.nombre,\n  year_publicacion = excluded.year_publicacion,\n  caratula = excluded.caratula,\n  discografica = excluded.discografica,\n  productor = excluded.productor,\n  estudio = excluded.estudio,\n  grupo_id = excluded.grupo_id;\n\nselect setval(\n  pg_get_serial_sequence('public.discos', 'id'),\n  coalesce((select max(id) from public.discos), 1),\n  true\n);\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: sourcePath,
      totalRecords: discos.length,
      output: OUTPUT_PATH,
    },
    null,
    2,
  ),
);

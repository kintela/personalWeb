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

if (!INPUT_PATH) {
  console.error(
    "Usage: node scripts/generate-cds-seed.mjs <path-to-results.json> [output-dir]",
  );
  process.exit(1);
}

function parseOptionalInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(String(value).trim(), 10);

  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function parseRequiredInteger(value, fieldName, index) {
  const parsedValue = parseOptionalInteger(value);

  if (parsedValue === null) {
    throw new Error(`CD at index ${index} is missing a valid ${fieldName}.`);
  }

  return parsedValue;
}

function parseOptionalBoolean(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`Unsupported boolean value: ${value}`);
}

function toSqlBoolean(value) {
  if (value == null) {
    return "null";
  }

  return value ? "true" : "false";
}

const sourcePath = path.resolve(INPUT_PATH);
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source)) {
  throw new Error("Expected a JSON array of CD records.");
}

const cds = source
  .map((item, index) => {
    const id = parseRequiredInteger(item.CDId, "CDId", index);
    const title = String(item.Titulo ?? "").trim();

    if (!title) {
      throw new Error(`CD at index ${index} is missing Titulo.`);
    }

    return {
      id,
      titulo: title,
      yearPublicacion: parseOptionalInteger(item.YearPublicacion),
      isInSpotify: parseOptionalBoolean(item.IsInSpotify),
      etiqueta: parseRequiredInteger(item.Etiqueta, "Etiqueta", index),
      caratula:
        item.caratula == null || item.caratula === ""
          ? null
          : String(item.caratula).trim(),
      firmado: parseOptionalBoolean(item.Firmado),
      grupoId: parseRequiredInteger(item.GrupoId, "GrupoId", index),
    };
  })
  .sort((left, right) => left.id - right.id);

const values = cds
  .map(
    (item) =>
      `  (${toSqlInteger(item.id)}::integer, ${toSqlText(
        item.titulo,
      )}::text, ${toSqlInteger(item.yearPublicacion)}::integer, ${toSqlBoolean(
        item.isInSpotify,
      )}::boolean, ${toSqlInteger(item.etiqueta)}::integer, ${toSqlText(
        item.caratula,
      )}::text, ${toSqlBoolean(item.firmado)}::boolean, ${toSqlInteger(
        item.grupoId,
      )}::bigint)`,
  )
  .join(",\n");

const outputPath = path.join(OUTPUT_DIR, "20260322_seed_cds.sql");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(
  outputPath,
  `begin;\n\nwith source (\n  id,\n  titulo,\n  year_publicacion,\n  is_in_spotify,\n  etiqueta,\n  caratula,\n  firmado,\n  grupo_id\n) as (\n  values\n${values}\n)\ninsert into public.cds (\n  id,\n  titulo,\n  year_publicacion,\n  is_in_spotify,\n  etiqueta,\n  caratula,\n  firmado,\n  grupo_id\n)\nselect\n  id,\n  titulo,\n  year_publicacion,\n  is_in_spotify,\n  etiqueta,\n  caratula,\n  firmado,\n  grupo_id\nfrom source\non conflict (id) do update\nset\n  titulo = excluded.titulo,\n  year_publicacion = excluded.year_publicacion,\n  is_in_spotify = excluded.is_in_spotify,\n  etiqueta = excluded.etiqueta,\n  caratula = excluded.caratula,\n  firmado = excluded.firmado,\n  grupo_id = excluded.grupo_id;\n\nselect setval(\n  pg_get_serial_sequence('public.cds', 'id'),\n  coalesce((select max(id) from public.cds), 1),\n  true\n);\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: sourcePath,
      totalRecords: cds.length,
      output: outputPath,
    },
    null,
    2,
  ),
);

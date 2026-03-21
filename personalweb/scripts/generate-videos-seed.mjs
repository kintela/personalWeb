import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_SEEDS_DIR,
  escapeSql,
  extractExportedArray,
  toSqlText,
} from "./lib/legacy-seed-utils.mjs";

const INPUT_PATH = process.argv[2];
const OUTPUT_DIR = process.argv[3]
  ? path.resolve(process.argv[3])
  : DEFAULT_SEEDS_DIR;

if (!INPUT_PATH) {
  console.error(
    "Usage: node scripts/generate-videos-seed.mjs <path-to-videos.ts|json> [output-dir]",
  );
  process.exit(1);
}

const sourcePath = path.resolve(INPUT_PATH);
const source = fs.readFileSync(sourcePath, "utf8");
const videos = extractExportedArray(source, "videos");

if (!Array.isArray(videos)) {
  throw new Error("Could not extract an array of videos from the source file.");
}

const values = videos
  .map((item, index) => {
    const image = item.imagen == null ? null : String(item.imagen).trim();
    const link = item.enlace == null ? null : String(item.enlace).trim();
    const text = item.texto == null ? null : String(item.texto).trim();
    const category = item.categoria == null ? null : String(item.categoria).trim();
    const platform =
      item.plataforma == null ? null : String(item.plataforma).trim();
    const info = item.info == null ? null : String(item.info).trim();

    if (!link) {
      throw new Error(`Video at index ${index} is missing enlace.`);
    }

    if (!text) {
      throw new Error(`Video at index ${index} is missing texto.`);
    }

    return `  (${index + 1}, ${toSqlText(image)}::text, ${toSqlText(
      link,
    )}::text, ${toSqlText(text)}::text, ${toSqlText(
      category,
    )}::text, ${toSqlText(platform)}::text, ${toSqlText(info)}::text)`;
  })
  .join(",\n");

const outputPath = path.join(OUTPUT_DIR, "20260321_seed_videos.sql");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(
  outputPath,
  `begin;\n\nwith source (\n  ord,\n  imagen,\n  enlace,\n  texto,\n  categoria,\n  plataforma,\n  info\n) as (\n  values\n${values}\n)\ninsert into public.videos (\n  imagen,\n  enlace,\n  texto,\n  categoria,\n  plataforma,\n  info\n)\nselect\n  imagen,\n  enlace,\n  texto,\n  categoria,\n  plataforma,\n  info\nfrom source\norder by ord;\n\ncommit;\n`,
);

console.log(
  JSON.stringify(
    {
      input: sourcePath,
      totalRecords: videos.length,
      output: outputPath,
      preview: videos.slice(0, 5).map((item) => ({
        texto: item.texto,
        categoria: item.categoria,
        plataforma: item.plataforma,
      })),
      note: `Strings are escaped with ${escapeSql("it's ok")}`,
    },
    null,
    2,
  ),
);

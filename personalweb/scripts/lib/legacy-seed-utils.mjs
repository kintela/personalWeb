import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const DEFAULT_SEEDS_DIR = path.join(PROJECT_ROOT, "supabase/seeds");

const GROUP_ALIASES = new Map([
  ["alice in chains", "Alice in chains"],
  ["coldplay", "Coldplay"],
  ["gin lady", "Gin Lady"],
  ["guns & roses", "Guns N' Roses"],
  ["guns and roses", "Guns N' Roses"],
  ["guns's and roses", "Guns N' Roses"],
  ["gun´s and roses", "Guns N' Roses"],
  ["gun's and roses", "Guns N' Roses"],
  ["o funkillo", "O'funkillo"],
  ["paco de lucia", "Paco de Lucia"],
  ["paco de lucía", "Paco de Lucia"],
  ["pearl jam", "Pearl Jam"],
  ["queens of the stone age", "Queens of the stone age"],
  ["the screamming cheetah wheelies", "The Screamin´ Cheetah Wheelies"],
  ["the screaming cheeetah wheelies", "The Screamin´ Cheetah Wheelies"],
  ["the screaming cheetah wheelies", "The Screamin´ Cheetah Wheelies"],
  ["the screaming cheetah whellies", "The Screamin´ Cheetah Wheelies"],
  ["the sisters of mercy", "The Sisters of Mercy"],
  ["wolfmother", "Wolfmother"],
]);

export function normalizeGroupName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’´`"]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

export function toSqlText(value) {
  return value == null ? "null" : `'${escapeSql(value)}'`;
}

export function toSqlInteger(value) {
  return Number.isInteger(value) ? String(value) : "null";
}

export function toSqlBoolean(value) {
  return value ? "true" : "false";
}

export function toSqlDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "null";
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `'${year}-${month}-${day}'`;
}

export function toSqlTextArray(values) {
  if (values.length === 0) {
    return "ARRAY[]::text[]";
  }

  return `ARRAY[${values.map((value) => `'${escapeSql(value)}'`).join(", ")}]::text[]`;
}

export function splitPeople(value) {
  if (!value) {
    return [];
  }

  return value
    .replace(/\s+y\s+/gi, ", ")
    .replace(/\.\s+/g, ", ")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createLegacyDateClass() {
  return class LegacyDate extends Date {
    constructor(...args) {
      if (
        args.length >= 2 &&
        typeof args[0] === "number" &&
        typeof args[1] === "number"
      ) {
        const [year, month, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0] =
          args;
        super(Date.UTC(year, month, day, hours, minutes, seconds, ms));
        return;
      }

      super(...args);
    }

    static UTC(...args) {
      return Date.UTC(...args);
    }

    static now() {
      return Date.now();
    }

    static parse(value) {
      return Date.parse(value);
    }
  };
}

export function extractExportedArray(source, exportName) {
  const trimmed = source.trim();

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  const sanitized = source
    .replace(/^import\s.+;$/gm, "")
    .replace(
      new RegExp(`export\\s+const\\s+${exportName}\\s*:\\s*[^=]+=`, "m"),
      `const ${exportName} =`,
    )
    .replace(
      new RegExp(`export\\s+const\\s+${exportName}\\s*=`, "m"),
      `const ${exportName} =`,
    );

  const context = {
    Date: createLegacyDateClass(),
  };

  return vm.runInNewContext(`${sanitized}\n${exportName};`, context, {
    timeout: 1000,
  });
}

export function extractSeedGroupNames(seedSql) {
  const names = new Map();
  const matcher = /\(\s*(?:\d+\s*,\s*)?'((?:[^']|'')*)'\s*\)/g;
  let match = matcher.exec(seedSql);

  while (match) {
    const rawName = match[1].replace(/''/g, "'");
    names.set(normalizeGroupName(rawName), rawName);
    match = matcher.exec(seedSql);
  }

  return names;
}

export function loadSeededGroups(seedsDir = DEFAULT_SEEDS_DIR) {
  const names = new Map();

  if (!fs.existsSync(seedsDir)) {
    return names;
  }

  const groupSeedFiles = fs
    .readdirSync(seedsDir)
    .filter((file) => file.includes("seed_grupos") && file.endsWith(".sql"))
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

export function getCanonicalGroupName(rawGroupName, seededGroups) {
  if (!rawGroupName) {
    return null;
  }

  const trimmed = rawGroupName.trim();
  const alias = GROUP_ALIASES.get(trimmed.toLowerCase());

  if (alias) {
    return alias;
  }

  const normalized = normalizeGroupName(trimmed);
  const seeded = seededGroups.get(normalized);

  return seeded ?? trimmed;
}

export function buildMissingGroupsSeed(missingGroups) {
  if (missingGroups.size === 0) {
    return "-- No missing groups detected.\n";
  }

  const values = [...missingGroups]
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
    .map((name) => `  ('${escapeSql(name)}')`)
    .join(",\n");

  return `begin;\n\ninsert into public.grupos (nombre)\nvalues\n${values}\non conflict (nombre) do nothing;\n\ncommit;\n`;
}

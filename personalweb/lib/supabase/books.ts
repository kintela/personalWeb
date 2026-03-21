import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BOOKS_SELECT_COLUMNS =
  "id, titulo, categoria, autor, isbn, caratula, enlace, deposito_legal, editorial, protagonista, sinopsis, created_at, updated_at";
const BOOK_COVER_BUCKET = "caratulas";
const BOOK_COVER_FOLDER = "libros";

type BookDatabaseRow = {
  id: number | string;
  titulo: string;
  categoria: string | null;
  autor: string | null;
  isbn: string | null;
  caratula: string | null;
  enlace: string | null;
  deposito_legal: string | null;
  editorial: string | null;
  protagonista: string | null;
  sinopsis: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BookAsset = {
  id: string;
  title: string;
  category: string | null;
  author: string | null;
  isbn: string | null;
  cover: string | null;
  coverSrc: string | null;
  link: string | null;
  legalDeposit: string | null;
  publisher: string | null;
  protagonist: string | null;
  synopsis: string | null;
};

export type BookListResult = {
  books: BookAsset[];
  configured: boolean;
  error: string | null;
  totalCount: number;
  filterValue: string;
  categoryValue: string;
  protagonistValue: string;
  categoryOptions: string[];
  protagonistOptions: string[];
};

type GetBookListOptions = {
  filterValue?: string | null;
  categoryValue?: string | null;
  protagonistValue?: string | null;
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

export function getBookCoverPublicUrl(coverPath: string | null) {
  const normalizedPath = coverPath?.trim();
  const supabaseUrl = getSupabaseUrl()?.trim();

  if (!normalizedPath || !supabaseUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const withoutLeadingSlash = normalizedPath.replace(/^\/+/, "");
  const pathWithoutBucket = withoutLeadingSlash.startsWith(`${BOOK_COVER_BUCKET}/`)
    ? withoutLeadingSlash.slice(BOOK_COVER_BUCKET.length + 1)
    : withoutLeadingSlash;
  const objectPath = pathWithoutBucket.startsWith(`${BOOK_COVER_FOLDER}/`)
    ? pathWithoutBucket
    : `${BOOK_COVER_FOLDER}/${pathWithoutBucket}`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(BOOK_COVER_BUCKET)}/${encodedPath}`;
}

function mapBook(row: BookDatabaseRow): BookAsset {
  return {
    id: String(row.id),
    title: row.titulo.trim(),
    category: row.categoria?.trim() || null,
    author: row.autor?.trim() || null,
    isbn: row.isbn?.trim() || null,
    cover: row.caratula?.trim() || null,
    coverSrc: getBookCoverPublicUrl(row.caratula),
    link: row.enlace?.trim() || null,
    legalDeposit: row.deposito_legal?.trim() || null,
    publisher: row.editorial?.trim() || null,
    protagonist: row.protagonista?.trim() || null,
    synopsis: row.sinopsis?.trim() || null,
  };
}

function normalizeBookFilterValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function buildBookSearchHaystack(book: BookDatabaseRow) {
  return [
    String(book.id),
    book.titulo,
    book.categoria,
    book.autor,
    book.isbn,
    book.caratula,
    book.enlace,
    book.deposito_legal,
    book.editorial,
    book.protagonista,
    book.sinopsis,
    book.created_at,
    book.updated_at,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" \n")
    .toLocaleLowerCase("es-ES");
}

export async function getBookList(
  options: GetBookListOptions = {},
): Promise<BookListResult> {
  const supabase = createSupabaseServerClient();
  const requestedFilterValue = normalizeBookFilterValue(options.filterValue);
  const requestedCategoryValue = normalizeBookFilterValue(options.categoryValue);
  const requestedProtagonistValue = normalizeBookFilterValue(
    options.protagonistValue,
  );

  if (!supabase) {
    return {
      books: [],
      configured: false,
      error:
        "Faltan variables de entorno de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y la clave pública o de servicio.",
      totalCount: 0,
      filterValue: requestedFilterValue,
      categoryValue: requestedCategoryValue,
      protagonistValue: requestedProtagonistValue,
      categoryOptions: [],
      protagonistOptions: [],
    };
  }

  const { data, error } = await supabase
    .from("libros")
    .select(BOOKS_SELECT_COLUMNS)
    .order("id", { ascending: true });

  if (error) {
    return {
      books: [],
      configured: true,
      error: `No he podido leer los libros: ${error.message}`,
      totalCount: 0,
      filterValue: requestedFilterValue,
      categoryValue: requestedCategoryValue,
      protagonistValue: requestedProtagonistValue,
      categoryOptions: [],
      protagonistOptions: [],
    };
  }

  const rows = (data as BookDatabaseRow[] | null) ?? [];
  const categoryOptions = [
    ...new Set(
      rows
        .map((row) => row.categoria?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const protagonistOptions = [
    ...new Set(
      rows
        .map((row) => row.protagonista?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
  const normalizedCategoryValue = categoryOptions.includes(requestedCategoryValue)
    ? requestedCategoryValue
    : "";
  const normalizedProtagonistValue = protagonistOptions.includes(
    requestedProtagonistValue,
  )
    ? requestedProtagonistValue
    : "";
  const normalizedFilterValue = requestedFilterValue.toLocaleLowerCase("es-ES");
  const filteredRows = rows.filter((book) => {
    const matchesCategory =
      !normalizedCategoryValue ||
      (book.categoria?.trim() ?? "") === normalizedCategoryValue;
    const matchesProtagonist =
      !normalizedProtagonistValue ||
      (book.protagonista?.trim() ?? "") === normalizedProtagonistValue;
    const matchesSearch =
      !normalizedFilterValue ||
      buildBookSearchHaystack(book).includes(normalizedFilterValue);

    return matchesCategory && matchesProtagonist && matchesSearch;
  });
  const books = filteredRows.map(mapBook);

  return {
    books,
    configured: true,
    error: null,
    totalCount: books.length,
    filterValue: requestedFilterValue,
    categoryValue: normalizedCategoryValue,
    protagonistValue: normalizedProtagonistValue,
    categoryOptions,
    protagonistOptions,
  };
}

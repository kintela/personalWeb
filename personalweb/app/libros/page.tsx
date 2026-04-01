import type { Metadata } from "next";
import { BooksViewer } from "@/components/books-viewer";
import { SectionPageShell } from "@/components/section-page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSingleSearchParam,
  type RouteSearchParams,
} from "@/lib/route-search-params";
import { getBookList } from "@/lib/supabase/books";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata("/libros");

export default async function LibrosPage(props: {
  searchParams: RouteSearchParams;
}) {
  const searchParams = await props.searchParams;
  const books = await getBookList({
    filterValue: getSingleSearchParam(searchParams.bookFilter).trim(),
    categoryValue: getSingleSearchParam(searchParams.bookCategory).trim(),
    protagonistValue: getSingleSearchParam(
      searchParams.bookProtagonist,
    ).trim(),
  });

  return (
    <SectionPageShell currentHref="/libros">
      <BooksViewer
        books={books.books}
        configured={books.configured}
        error={books.error}
        totalCount={books.totalCount}
        filterValue={books.filterValue}
        categoryValue={books.categoryValue}
        protagonistValue={books.protagonistValue}
        categoryOptions={books.categoryOptions}
        protagonistOptions={books.protagonistOptions}
      />
    </SectionPageShell>
  );
}

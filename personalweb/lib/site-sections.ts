export type SiteSection = {
  href: string;
  sectionId: string;
  title: string;
  eyebrow: string;
  description: string;
  summary: string;
};

export const SITE_SECTIONS: SiteSection[] = [
  {
    href: "/fotos",
    sectionId: "fotos",
    title: "Fotos",
    eyebrow: "PhotoTeka",
    description:
      "Galería personal con filtros, personas, fechas y acceso a la subida de imágenes.",
    summary: "Archivo fotográfico navegable por páginas.",
  },
  {
    href: "/conciertos",
    sectionId: "conciertos",
    title: "Conciertos",
    eyebrow: "Directo",
    description:
      "Listado de conciertos con ciudad, año, grupo y material relacionado cuando existe.",
    summary: "Memoria de directos con filtros por contexto.",
  },
  {
    href: "/cds",
    sectionId: "cds",
    title: "CDs",
    eyebrow: "Discoteca",
    description:
      "Colección de CDs con filtros por grupo, año y enlaces asociados a Spotify.",
    summary: "Biblioteca física de discos en formato CD.",
  },
  {
    href: "/vinilos",
    sectionId: "vinilos",
    title: "Vinilos",
    eyebrow: "Portadas",
    description:
      "Selección de vinilos con sus portadas y el inventario correspondiente.",
    summary: "Colección visual de discos en formato grande.",
  },
  {
    href: "/libros",
    sectionId: "libros",
    title: "Libros",
    eyebrow: "Lecturas",
    description:
      "Listado de libros con filtros por categoría y protagonista principal.",
    summary: "Estantería navegable de lecturas y temas.",
  },
  {
    href: "/historia",
    sectionId: "historia",
    title: "Historia",
    eyebrow: "Archivo",
    description:
      "Vídeos y material histórico organizados como una sección específica del sitio.",
    summary: "Selección temática de historia audiovisual.",
  },
  {
    href: "/guitarra",
    sectionId: "guitarra",
    title: "Guitarra",
    eyebrow: "Cuerdas",
    description:
      "Vídeos generales, temas, letras en imagen y recursos prácticos para tocar.",
    summary: "Repertorio y materiales de guitarra en una sola vista.",
  },
  {
    href: "/mtv",
    sectionId: "mtv",
    title: "MTV",
    eyebrow: "TV",
    description:
      "Selección de vídeos musicales enlazados y valorados como bloque independiente.",
    summary: "Vídeos musicales cacheados y ordenados.",
  },
  {
    href: "/spotify",
    sectionId: "spotify",
    title: "Spotify",
    eyebrow: "Playlists",
    description:
      "Playlists, accesos rápidos, pistas y emparejamiento con vídeos cuando existe.",
    summary: "Entrada dedicada a música, listas y descubrimiento.",
  },
  {
    href: "/videos",
    sectionId: "videos",
    title: "Vídeos",
    eyebrow: "Películas",
    description:
      "Listado general de vídeos con filtros por categoría y plataforma.",
    summary: "Catálogo audiovisual separado del resto del sitio.",
  },
];

export function getSiteSection(href: string) {
  return SITE_SECTIONS.find((section) => section.href === href) ?? null;
}
